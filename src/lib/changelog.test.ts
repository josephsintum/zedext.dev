import { describe, expect, it } from 'vitest';
import { releasesToMarkdown, trimChangelog } from './changelog.js';
import type { GitHubRelease } from './types.js';

describe('trimChangelog', () => {
	const changelog = (n: number) =>
		[
			'# Changelog',
			...Array.from({ length: n }, (_, i) => `## ${n - i}.0.0\n\n### Fixed\n\n- thing ${i}`)
		].join('\n\n');

	it('keeps only the latest entries, counted at the repeating heading level', () => {
		const out = trimChangelog(changelog(30), 20);
		expect(out).toContain('## 30.0.0');
		expect(out).toContain('## 11.0.0');
		expect(out).not.toContain('## 10.0.0');
		expect(out.match(/^### Fixed/gm)).toHaveLength(20); // subsections aren't entries
	});

	it('leaves short changelogs alone and ignores headings inside code fences', () => {
		const fenced =
			'# Changelog\n\n## 1.0.0\n\n```md\n## not an entry\n## nor this\n```\n\n## 0.9.0\n';
		expect(trimChangelog(fenced, 1)).toBe(
			'# Changelog\n\n## 1.0.0\n\n```md\n## not an entry\n## nor this\n```'
		);
		expect(trimChangelog(changelog(3), 20)).toBe(changelog(3));
	});

	it('caps a changelog with no entry structure by size', () => {
		const prose = 'word '.repeat(50_000); // 250,000 characters, no headings
		expect(trimChangelog(prose).length).toBeLessThanOrEqual(100_000);
	});
});

describe('releasesToMarkdown', () => {
	const release = (
		tag: string,
		body: string | null,
		extra: Partial<GitHubRelease> = {}
	): GitHubRelease => ({
		tag_name: tag,
		name: null,
		body,
		published_at: '2026-10-09T12:00:00Z',
		draft: false,
		...extra
	});

	it('turns releases with notes into dated entries, newest first as given', () => {
		const md = releasesToMarkdown([
			release('v1.1.0', '- Faster startup', { name: 'Speed release' }),
			release('v1.0.0', '- First release')
		]);
		expect(md).toBe(
			'## Speed release · Oct 9, 2026\n\n- Faster startup\n\n## v1.0.0 · Oct 9, 2026\n\n- First release'
		);
	});

	it('skips drafts and notes that are empty or only the auto-generated compare link', () => {
		const md = releasesToMarkdown([
			release('v3', '**Full Changelog**: https://github.com/o/r/compare/v2...v3'),
			release('v2', '   '),
			release('v1.5', '- draft notes', { draft: true }),
			release('v1', '- Real notes\n\n**Full Changelog**: https://github.com/o/r/commits/v1')
		]);
		expect(md).toBe('## v1 · Oct 9, 2026\n\n- Real notes');
		expect(releasesToMarkdown([release('v3', null)])).toBeNull();
	});

	it('demotes headings inside notes so each release stays one entry', () => {
		const md = releasesToMarkdown([release('v2', "## What's Changed\n- a")]);
		expect(md).toBe("## v2 · Oct 9, 2026\n\n#### What's Changed\n- a");
	});

	it('keeps at most the latest entries', () => {
		const many = Array.from({ length: 25 }, (_, i) => release(`v${25 - i}`, `- change ${i}`));
		expect(releasesToMarkdown(many, 20)!.match(/^## /gm)).toHaveLength(20);
	});
});
