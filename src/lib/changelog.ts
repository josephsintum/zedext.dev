/**
 * An extension's changelog: its repo's CHANGELOG.md (or CHANGES.md), else its GitHub
 * Releases. Zed's packages don't include one, unlike VS Code's.
 */

import type { GitHubContentEntry, GitHubRelease } from './types.js';
import { formatDate } from './utils/format.js';

export const MAX_CHANGELOG_ENTRIES = 20;
/** Some changelogs run to hundreds of KB; the page shows the start and links to the rest */
const MAX_CHANGELOG_CHARS = 100_000;

const FILE_PREFERENCE = ['changelog.md', 'changes.md'];

export function findChangelogFile(entries: GitHubContentEntry[]): GitHubContentEntry | null {
	for (const wanted of FILE_PREFERENCE) {
		const found = entries.find((e) => e.type === 'file' && e.name.toLowerCase() === wanted);
		if (found) return found;
	}
	return null;
}

/**
 * The latest `maxEntries` entries. An entry starts at the shallowest heading level that
 * repeats ("## 1.2.0" in most files, "# 1.2.0" in some); deeper ones ("### Fixed") are
 * sections inside it. Headings in code fences don't count.
 */
export function trimChangelog(markdown: string, maxEntries = MAX_CHANGELOG_ENTRIES): string {
	const lines = markdown.split('\n');
	const headings: { line: number; level: number }[] = [];
	let inFence = false;
	lines.forEach((line, i) => {
		if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
		const m = inFence ? null : /^(#{1,3})\s/.exec(line);
		if (m) headings.push({ line: i, level: m[1].length });
	});

	let out = markdown;
	const level = [1, 2, 3].find((n) => headings.filter((h) => h.level === n).length > 1);
	if (level !== undefined) {
		const entries = headings.filter((h) => h.level === level);
		if (entries.length > maxEntries) {
			out = lines.slice(0, entries[maxEntries].line).join('\n').trimEnd();
		}
	}
	if (out.length > MAX_CHANGELOG_CHARS) {
		const cut = out.lastIndexOf('\n', MAX_CHANGELOG_CHARS);
		out = out.slice(0, cut > 0 ? cut : MAX_CHANGELOG_CHARS);
	}
	return out;
}

/** GitHub's generated notes end with (or are only) this line */
const AUTO_LINK = /^\*\*Full Changelog\*\*:.*$/gm;

/** Releases as one changelog, one "## <name> · <date>" entry each; null if none have notes. */
export function releasesToMarkdown(
	releases: GitHubRelease[],
	maxEntries = MAX_CHANGELOG_ENTRIES
): string | null {
	const entries = releases
		.filter((r) => !r.draft && r.published_at)
		.map((r) => ({ r, notes: (r.body ?? '').replace(AUTO_LINK, '').trim() }))
		.filter(({ notes }) => notes.length > 0)
		.slice(0, maxEntries)
		.map(({ r, notes }) => {
			const title = r.name?.trim() || r.tag_name;
			// "## What's Changed" inside the notes would otherwise look like another release
			const demoted = notes.replace(/^(#{1,4})(\s)/gm, '##$1$2');
			return `## ${title} · ${formatDate(r.published_at!)}\n\n${demoted}`;
		});
	return entries.length > 0 ? entries.join('\n\n') : null;
}
