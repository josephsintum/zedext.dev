import { env } from '$env/dynamic/private';
import { getCached } from './cache.js';
import type { GitHubRepo, GitHubReadme } from '$lib/types.js';

const GITHUB_API = 'https://api.github.com';
const ONE_HOUR = 60 * 60 * 1000;
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

function headers(): Record<string, string> {
	const h: Record<string, string> = { Accept: 'application/vnd.github.v3+json' };
	if (env.GITHUB_TOKEN) h.Authorization = `token ${env.GITHUB_TOKEN}`;
	return h;
}

export async function getRepoMetadata(owner: string, repo: string): Promise<GitHubRepo | null> {
	return getCached(`gh:meta:${owner}/${repo}`, ONE_HOUR, async () => {
		try {
			const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, { headers: headers() });
			if (!res.ok) return null;
			return await res.json();
		} catch {
			return null;
		}
	});
}

export async function getReadmeMarkdown(owner: string, repo: string): Promise<{ markdown: string; defaultBranch: string } | null> {
	return getCached(`gh:readme:${owner}/${repo}`, TWENTY_FOUR_HOURS, async () => {
		try {
			const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/readme`, { headers: headers() });
			if (!res.ok) return null;

			const data: GitHubReadme = await res.json();
			const markdown = Buffer.from(data.content, 'base64').toString('utf-8');

			// Also fetch default branch for image URL rewriting
			const repoRes = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, { headers: headers() });
			const repoData = repoRes.ok ? await repoRes.json() : null;
			const defaultBranch = repoData?.default_branch ?? 'main';

			return { markdown, defaultBranch };
		} catch {
			return null;
		}
	});
}
