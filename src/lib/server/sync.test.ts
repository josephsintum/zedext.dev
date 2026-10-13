import { describe, expect, it, vi } from 'vitest';
import {
	assertPublishable,
	buildRecords,
	fetchGitHubStats,
	fetchZedExtensions,
	repoKey,
	type GitHubStats
} from './sync.js';
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

// --- Network steps, with fetch stubbed ---

type Handler = (url: string, init?: RequestInit) => Response | Promise<Response>;
const deps = (handler: Handler) => ({
	fetch: vi.fn(async (input: string | URL | Request, init?: RequestInit) =>
		handler(String(input), init)
	),
	sleep: async () => {}
});
const json = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const silent = () => {};

describe('fetchGitHubStats', () => {
	const keys = Array.from({ length: 150 }, (_, i) => `o/r${i}`); // two batches: 100 + 50
	const okBatch = (init?: RequestInit) => {
		const query: string = JSON.parse(String(init?.body)).query;
		const aliases = [...query.matchAll(/(r\d+): repository/g)].map((m) => m[1]);
		return json({
			data: Object.fromEntries(
				aliases.map((a) => [a, { stargazerCount: 1, pushedAt: null, licenseInfo: null }])
			)
		});
	};

	it('retries a transient batch failure', async () => {
		let calls = 0;
		const d = deps((_, init) =>
			++calls === 1 ? new Response('', { status: 502 }) : okBatch(init)
		);
		const stats = await fetchGitHubStats(keys, 'token', silent, d);
		expect([...stats.values()].every((s) => s?.github_stars === 1)).toBe(true);
	});

	it('marks a persistently failing batch as failed and keeps the rest', async () => {
		// The first batch (repos r0–r99) always fails; the second (r100–r149) works
		const d = deps((_, init) =>
			String(init?.body).includes('name: \\"r0\\"')
				? new Response('', { status: 502 })
				: okBatch(init)
		);
		const stats = await fetchGitHubStats(keys, 'token', silent, d);
		expect(stats.get('o/r0')).toBeNull(); // first batch failed → carried forward later
		expect(stats.get('o/r120')?.github_stars).toBe(1);
	});

	it('fails the sync when every batch fails', async () => {
		const d = deps(() => new Response('', { status: 502 }));
		await expect(fetchGitHubStats(keys, 'token', silent, d)).rejects.toThrow(/every batch/);
	});

	it('fails immediately on a rejected token', async () => {
		const d = deps(() => new Response('', { status: 401 }));
		await expect(fetchGitHubStats(keys, 'token', silent, d)).rejects.toThrow(/401/);
		expect(d.fetch).toHaveBeenCalledTimes(1);
	});
});

describe('fetchZedExtensions', () => {
	const bulk = () => json({ data: [zed('a', '')] });

	it('retries rate-limited lookups', async () => {
		let calls = 0;
		const d = deps((url) =>
			url.includes('max_schema_version')
				? bulk()
				: ++calls === 1
					? new Response('', { status: 429 })
					: json({ data: [zed('b', '')] })
		);
		const { extensions } = await fetchZedExtensions(['a', 'b'], silent, d);
		expect(extensions.map((e) => e.id).sort()).toEqual(['a', 'b']);
	});

	it('treats an empty result as a removed extension, not a failure', async () => {
		const d = deps((url) => (url.includes('max_schema_version') ? bulk() : json({ data: [] })));
		const { extensions } = await fetchZedExtensions(['a', 'gone'], silent, d);
		expect(extensions.map((e) => e.id)).toEqual(['a']);
	});

	it('fails the sync when many lookups still fail after retries', async () => {
		const ids = ['a', ...Array.from({ length: 50 }, (_, i) => `x${i}`)];
		const d = deps((url) =>
			url.includes('max_schema_version') ? bulk() : new Response('', { status: 503 })
		);
		await expect(fetchZedExtensions(ids, silent, d)).rejects.toThrow(/lookups failed/);
	});
});
