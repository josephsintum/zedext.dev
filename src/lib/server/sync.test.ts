import { describe, expect, it } from 'vitest';
import { assertPublishable, buildRecords, repoKey, type GitHubStats } from './sync.js';
import type { ExtensionRecord, Snapshot, ZedExtension } from '../types.js';

function zed(id: string, repository: string): ZedExtension {
	return {
		id,
		name: id,
		version: '1.0.0',
		description: null,
		authors: ['Ada <ada@example.com>'],
		repository,
		schema_version: 1,
		wasm_api_version: null,
		provides: ['themes'],
		published_at: '2026-01-01T00:00:00Z',
		download_count: 10
	};
}

function snapshotOf(records: Partial<ExtensionRecord>[]): Snapshot {
	return {
		generatedAt: '2026-10-01T00:00:00Z',
		extensions: records.map((r) => ({
			...buildRecords([zed(r.id!, '')], new Map(), null).records[0],
			...r
		}))
	};
}

const stats = (stars: number): GitHubStats => ({
	github_stars: stars,
	github_license: 'MIT',
	github_pushed_at: '2026-10-01T00:00:00Z'
});

describe('repoKey', () => {
	it('normalizes GitHub URLs', () => {
		expect(repoKey('https://github.com/Catppuccin/Zed.git')).toBe('catppuccin/zed');
	});

	it('skips the Zed monorepo and non-GitHub repos', () => {
		expect(repoKey('https://github.com/zed-industries/zed')).toBeNull();
		expect(repoKey('https://gitlab.com/a/b')).toBeNull();
		expect(repoKey(null)).toBeNull();
	});
});

describe('buildRecords', () => {
	const exts = [zed('a', 'https://github.com/o/a'), zed('b', 'https://github.com/o/b')];

	it('uses fresh GitHub stats and parses author names', () => {
		const github = new Map([
			['o/a', stats(5)],
			['o/b', stats(7)]
		]);
		const { records, carriedForward } = buildRecords(exts, github, null);
		expect(records.map((r) => r.github_stars)).toEqual([5, 7]);
		expect(records[0].authors).toEqual(['Ada']);
		expect(carriedForward).toBe(0);
	});

	it('carries forward previous GitHub stats when a lookup failed', () => {
		const previous = snapshotOf([{ id: 'b', github_stars: 99, github_license: 'Apache-2.0' }]);
		const github = new Map<string, GitHubStats | null>([
			['o/a', stats(5)],
			['o/b', null]
		]);
		const { records, carriedForward } = buildRecords(exts, github, previous);
		expect(records[1]).toMatchObject({ github_stars: 99, github_license: 'Apache-2.0' });
		expect(carriedForward).toBe(1);
	});

	it('leaves stats empty for a failed lookup with no history', () => {
		const { records } = buildRecords(exts, new Map([['o/b', null]]), null);
		expect(records[1].github_stars).toBe(0);
	});
});

describe('assertPublishable', () => {
	const previous = snapshotOf(Array.from({ length: 100 }, (_, i) => ({ id: `e${i}` })));
	const records = (n: number) => previous.extensions.slice(0, n);

	it('allows a first publish and small shrinkage', () => {
		expect(() => assertPublishable(records(50), null)).not.toThrow();
		expect(() => assertPublishable(records(90), previous)).not.toThrow();
	});

	it('refuses an empty snapshot or a large drop', () => {
		expect(() => assertPublishable([], null)).toThrow(/empty/);
		expect(() => assertPublishable(records(89), previous)).toThrow(/Refusing/);
	});
});
