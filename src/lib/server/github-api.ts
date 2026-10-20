import { env } from '$env/dynamic/private';
import { getCached } from './cache.js';
import { CHANGELOG_FILES, rawFileUrl, releasesToMarkdown, trimChangelog } from '$lib/changelog.js';
import type { GitHubRelease, GitHubRepo, GitHubReadme, GitHubUser } from '$lib/types.js';

const GITHUB_API = 'https://api.github.com';
const ONE_HOUR = 60 * 60 * 1000;
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
/** A hung GitHub request fails (the page answers 503 and is retried) instead of holding it */
const TIMEOUT_MS = 5000;

function headers(): Record<string, string> {
	const h: Record<string, string> = { Accept: 'application/vnd.github.v3+json' };
	if (env.GITHUB_TOKEN) h.Authorization = `token ${env.GITHUB_TOKEN}`;
	return h;
}

/**
 * null when GitHub won't ever serve the thing: not found (404), gone (410), blocked for legal
 * reasons (451) or access blocked (a 403 that isn't a rate limit). Those are safe to cache.
 * Failures that clear (rate limits, 429, 5xx, bad token, network) throw, so they aren't cached
 * and callers can tell "no README" apart from "GitHub had a hiccup".
 */
async function fetchOrNull(url: string): Promise<Response | null> {
	const res = await fetch(url, { headers: headers(), signal: AbortSignal.timeout(TIMEOUT_MS) });
	if (res.status === 404 || res.status === 410 || res.status === 451) return null;
	if (res.status === 403 && !isRateLimited(res)) return null;
	if (!res.ok) throw new Error(`GitHub ${res.status} for ${url}`);
	return res;
}

/** GitHub's primary and secondary rate limits both answer 403 with one of these headers */
function isRateLimited(res: Response): boolean {
	return res.headers.get('x-ratelimit-remaining') === '0' || res.headers.has('retry-after');
}

export async function getRepoMetadata(owner: string, repo: string): Promise<GitHubRepo | null> {
	return getCached(`gh:meta:${owner}/${repo}`, ONE_HOUR, async () => {
		const res = await fetchOrNull(`${GITHUB_API}/repos/${owner}/${repo}`);
		return res ? await res.json() : null;
	});
}

export async function getLanguageDocsMarkdown(langId: string): Promise<string | null> {
	return getCached(`gh:lang-docs:${langId}`, TWENTY_FOUR_HOURS, async () => {
		const res = await fetchOrNull(
			`https://raw.githubusercontent.com/zed-industries/zed/main/docs/src/languages/${langId}.md`
		);
		if (!res) return null;
		const text = await res.text();
		return text.replace(/^---\n[\s\S]*?\n---\n/, '');
	});
}

export async function getGitHubUser(username: string): Promise<GitHubUser | null> {
	return getCached(`gh:user:${username}`, ONE_HOUR, async () => {
		const res = await fetchOrNull(`${GITHUB_API}/users/${username}`);
		return res ? await res.json() : null;
	});
}

export interface Readme {
	markdown: string;
	/** The README's folder ('' at the root; GitHub also finds .github/ and docs/ READMEs) */
	dir: string;
}

export async function getReadme(owner: string, repo: string): Promise<Readme | null> {
	return getCached(`gh:readme:${owner}/${repo}`, TWENTY_FOUR_HOURS, async () => {
		const res = await fetchOrNull(`${GITHUB_API}/repos/${owner}/${repo}/readme`);
		if (!res) return null;
		const data: GitHubReadme = await res.json();
		const slash = data.path?.lastIndexOf('/') ?? -1;
		return {
			markdown: Buffer.from(data.content, 'base64').toString('utf-8'),
			dir: slash > 0 ? data.path.slice(0, slash) : ''
		};
	});
}

export interface Changelog {
	markdown: string;
	/** Where "Full changelog on GitHub →" points */
	url: string;
}

/** The repo's CHANGELOG.md, else its GitHub Releases; null if neither. */
export async function getChangelog(owner: string, repo: string): Promise<Changelog | null> {
	return getCached(`gh:changelog:${owner}/${repo}`, TWENTY_FOUR_HOURS, async () => {
		// The raw host doesn't count against the API limit
		for (const file of CHANGELOG_FILES) {
			const res = await fetchOrNull(rawFileUrl(owner, repo, file));
			if (res) {
				return {
					markdown: trimChangelog(await res.text()),
					url: `https://github.com/${owner}/${repo}/blob/HEAD/${file}`
				};
			}
		}
		const releases = await fetchOrNull(`${GITHUB_API}/repos/${owner}/${repo}/releases?per_page=30`);
		const markdown = releases
			? releasesToMarkdown((await releases.json()) as GitHubRelease[])
			: null;
		return markdown ? { markdown, url: `https://github.com/${owner}/${repo}/releases` } : null;
	});
}
