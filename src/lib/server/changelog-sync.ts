/**
 * Which extensions have a changelog, recorded in the snapshot so extension pages can show
 * the tab without asking GitHub on every view. No SvelteKit imports (runs in the sync).
 */

import { CHANGELOG_FILES, rawFileUrl, releasesToMarkdown } from '../changelog.js';
import { parseRepoUrl } from '../utils/parse-repo-url.js';
import type { ChangelogSource, ExtensionRecord, GitHubRelease, Snapshot } from '../types.js';
import type { NetDeps } from './net.js';

/** Repos checked per sync, so the first (backfill) run stays inside the time limit */
export const CHANGELOG_CHECK_LIMIT = 800;

export function changelogRepo(r: ExtensionRecord): { owner: string; repo: string } | null {
	const parsed = parseRepoUrl(r.repository ?? '');
	// Built-in extensions live in the Zed monorepo, whose changelog isn't theirs
	if (!parsed || (parsed.owner === 'zed-industries' && parsed.repo === 'zed')) return null;
	return parsed;
}

/** Records never checked, or whose version changed since (a release may have added notes). */
export function changelogTargets(
	records: ExtensionRecord[],
	previous: Snapshot | null,
	limit: number
): ExtensionRecord[] {
	const prevById = new Map(previous?.extensions.map((r) => [r.id, r]));
	return records
		.filter((r) => {
			if (!changelogRepo(r)) return false;
			const prev = prevById.get(r.id);
			return prev?.changelog === undefined || prev.version !== r.version;
		})
		.slice(0, limit);
}

/**
 * This run's result where there is one; otherwise the previous snapshot's. A failed
 * re-check of a "none" is forgotten instead, so the next sync tries again (a version bump
 * may have added a changelog); a known changelog stays shown.
 */
export function withChangelogs(
	records: ExtensionRecord[],
	previous: Snapshot | null,
	found: Map<string, ChangelogSource | null>,
	failed: Set<string> = new Set()
): ExtensionRecord[] {
	const prevById = new Map(previous?.extensions.map((r) => [r.id, r]));
	return records.map((r) => {
		let changelog = found.has(r.id) ? found.get(r.id) : prevById.get(r.id)?.changelog;
		if (!found.has(r.id) && failed.has(r.id) && changelog === null) changelog = undefined;
		return changelog === undefined ? r : { ...r, changelog };
	});
}

/** Like the preview downloads: a stalled connection must not hold the sync past its limit */
const REQUEST_TIMEOUT_MS = 10_000;

/**
 * 'file' when the repo has a CHANGELOG.md (checked on raw.githubusercontent.com, which
 * doesn't count against the API limit); else 'releases' when a release has real notes.
 * Throws on any failure other than "not there", so the repo is checked again next sync.
 */
export async function detectChangelog(
	owner: string,
	repo: string,
	token: string,
	deps: NetDeps
): Promise<ChangelogSource | null> {
	for (const file of CHANGELOG_FILES) {
		const res = await deps.fetch(rawFileUrl(owner, repo, file), {
			method: 'HEAD',
			signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
		});
		if (res.ok) return 'file';
		if (res.status !== 404) throw new Error(`raw.githubusercontent.com ${res.status}`);
	}
	const res = await deps.fetch(
		`https://api.github.com/repos/${owner}/${repo}/releases?per_page=10`,
		{
			headers: { Authorization: `bearer ${token}`, Accept: 'application/vnd.github+json' },
			signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
		}
	);
	if (res.status === 404) return null;
	if (!res.ok) throw new Error(`GitHub releases ${res.status}`);
	return releasesToMarkdown((await res.json()) as GitHubRelease[]) ? 'releases' : null;
}
