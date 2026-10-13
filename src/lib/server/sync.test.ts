import { describe, expect, it, vi } from 'vitest';
import {
	assertPublishable,
	buildHistory,
	buildRecords,
	fetchFirstPublished,
	fetchGitHubStats,
	fetchZedExtensions,
	idsNeedingFirstPublished,
	repoKey,
	runSync,
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

	it('takes first release dates from this run, else from the previous snapshot', () => {
		const previous = snapshotOf([{ id: 'b', first_published_at: '2025-03-01T00:00:00Z' }]);
		const first = new Map([['a', '2024-02-14T00:00:00Z']]);
		const { records } = buildRecords([...exts, zed('c', '')], new Map(), previous, first);
		expect(records.map((r) => r.first_published_at)).toEqual([
			'2024-02-14T00:00:00Z',
			'2025-03-01T00:00:00Z',
			null
		]);
	});

	it('leaves stats empty for a failed lookup with no history', () => {
		const { records } = buildRecords(exts, new Map([['o/b', null]]), null);
		expect(records[1].github_stars).toBe(0);
	});
});

describe('buildHistory', () => {
	it('records each extension download count under the UTC date', () => {
		const exts = [
			{ ...zed('a', ''), download_count: 5 },
			{ ...zed('b', ''), download_count: 7 }
		];
		// 23:30 in UTC-8 is already the next day in UTC
		const history = buildHistory('2026-10-14T07:30:00.000Z', exts);
		expect(history).toEqual({ date: '2026-10-14', downloads: { a: 5, b: 7 } });
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

	// Zed lists an extension's versions oldest first
	const versions = (id: string, dates: string[]) =>
		json({
			data: dates.map((d, i) => ({ ...zed(id, ''), version: `0.0.${i + 1}`, published_at: d }))
		});

	it('uses the latest version of a looked-up extension and records its first release', async () => {
		const d = deps((url) =>
			url.includes('max_schema_version')
				? bulk()
				: versions('b', ['2024-01-01T00:00:00Z', '2024-06-01T00:00:00Z', '2025-01-01T00:00:00Z'])
		);
		const { extensions, firstPublished } = await fetchZedExtensions(['a', 'b'], silent, d);
		const b = extensions.find((e) => e.id === 'b');
		expect(b).toMatchObject({ version: '0.0.3', published_at: '2025-01-01T00:00:00Z' });
		expect(firstPublished.get('b')).toBe('2024-01-01T00:00:00Z');
		expect(firstPublished.has('a')).toBe(false); // bulk entries only carry the latest version
	});

	it('fails the sync when many lookups still fail after retries', async () => {
		const ids = ['a', ...Array.from({ length: 50 }, (_, i) => `x${i}`)];
		const d = deps((url) =>
			url.includes('max_schema_version') ? bulk() : new Response('', { status: 503 })
		);
		await expect(fetchZedExtensions(ids, silent, d)).rejects.toThrow(/lookups failed/);
	});
});

describe('idsNeedingFirstPublished', () => {
	const exts = ['a', 'b', 'c', 'd'].map((id) => zed(id, ''));

	it('skips ids dated this run or in the previous snapshot, up to a per-run cap', () => {
		const previous = snapshotOf([
			{ id: 'b', first_published_at: '2025-01-01T00:00:00Z' },
			{ id: 'c', first_published_at: null }
		]);
		const thisRun = new Map([['a', '2024-01-01T00:00:00Z']]);
		expect(idsNeedingFirstPublished(exts, thisRun, previous, 10)).toEqual(['c', 'd']);
		// The cap keeps a first run's backfill bounded; later syncs pick up the rest
		expect(idsNeedingFirstPublished(exts, thisRun, previous, 1)).toEqual(['c']);
	});
});

describe('fetchFirstPublished', () => {
	it('returns the earliest version date for each extension', async () => {
		const d = deps((url) =>
			json({
				data: [
					{ ...zed('a', ''), published_at: '2024-05-01T00:00:00Z' },
					{ ...zed('a', ''), published_at: '2024-02-01T00:00:00Z' }
				].map((v) => ({ ...v, id: url.split('/').pop() }))
			})
		);
		const first = await fetchFirstPublished(['a', 'b'], silent, d);
		expect(Object.fromEntries(first)).toEqual({
			a: '2024-02-01T00:00:00Z',
			b: '2024-02-01T00:00:00Z'
		});
	});

	it('skips extensions whose lookup fails or that were removed, without failing the sync', async () => {
		const d = deps((url) =>
			url.endsWith('/bad')
				? new Response('', { status: 503 })
				: url.endsWith('/gone')
					? json({ data: [] })
					: json({ data: [{ ...zed('ok', ''), published_at: '2024-02-01T00:00:00Z' }] })
		);
		const first = await fetchFirstPublished(['ok', 'bad', 'gone'], silent, d);
		expect([...first.keys()]).toEqual(['ok']);
	});
});

describe('runSync', () => {
	const env = { GITHUB_TOKEN: 't', BLOB_READ_WRITE_TOKEN: 'b' };
	const zedOnly = (github: () => Response) =>
		deps((url) => {
			if (url.endsWith('extensions.toml')) return new Response('[a]\nversion = "1.0.0"\n');
			if (url.includes('max_schema_version'))
				return json({ data: [zed('a', 'https://github.com/o/a')] });
			if (url.includes('graphql')) return github();
			return json({ data: [zed('a', '')] }); // first release lookup
		});
	const put = () =>
		vi.fn(async (path: string, _body: string, _options: object) => ({
			url: `https://blob.test/${path}`
		}));

	it("saves the day's download history even when GitHub rejects the token", async () => {
		const write = put();
		const d = zedOnly(() => new Response('', { status: 401 }));
		await expect(runSync({ env, log: silent, deps: d, put: write })).rejects.toThrow(/401/);
		const paths = write.mock.calls.map(([path]) => path);
		expect(paths).toHaveLength(1);
		expect(paths[0]).toMatch(/^history\/\d{4}-\d{2}-\d{2}\.json$/);
	});

	it('does not save history from a Zed result much smaller than the previous snapshot', async () => {
		const write = put();
		const previous = snapshotOf(Array.from({ length: 20 }, (_, i) => ({ id: `e${i}` })));
		const d = deps((url) => {
			if (url.startsWith('https://blob.test/extensions.json')) return json(previous);
			if (url.endsWith('extensions.toml')) return new Response('[a]\nversion = "1.0.0"\n');
			return json({ data: [zed('a', '')] });
		});
		await expect(
			runSync({
				env: { ...env, SNAPSHOT_URL: 'https://blob.test/extensions.json' },
				log: silent,
				deps: d,
				put: write
			})
		).rejects.toThrow(/Refusing/);
		expect(write).not.toHaveBeenCalled();
	});

	describe('as the backup run', () => {
		const backupEnv = { ...env, SNAPSHOT_URL: 'https://blob.test/extensions.json' };

		it("skips when today's history file already exists", async () => {
			const write = put();
			const d = deps((url, init) =>
				init?.method === 'HEAD' && url.includes('/history/')
					? new Response(null, { status: 200 })
					: new Response('', { status: 500 })
			);
			const result = await runSync({
				env: backupEnv,
				log: silent,
				deps: d,
				put: write,
				onlyIfHistoryMissing: true
			});
			expect(result).toMatchObject({ skipped: expect.stringMatching(/already/) });
			expect(write).not.toHaveBeenCalled();
		});

		it("runs when today's history file is missing", async () => {
			const write = put();
			const d = deps(
				(url, init) =>
					init?.method === 'HEAD' && url.includes('/history/')
						? new Response(null, { status: 404 })
						: new Response('', { status: 503 }) // the run itself then fails on the previous snapshot
			);
			await expect(
				runSync({ env: backupEnv, log: silent, deps: d, put: write, onlyIfHistoryMissing: true })
			).rejects.toThrow(/Snapshot fetch failed/);
		});

		it('never overwrites a history file, in case the check wrongly said it was missing', async () => {
			const write = put();
			const previous = snapshotOf([{ id: 'a' }]);
			const d = deps((url, init) => {
				if (init?.method === 'HEAD') return new Response(null, { status: 403 });
				if (url.startsWith('https://blob.test/extensions.json')) return json(previous);
				if (url.endsWith('extensions.toml')) return new Response('[a]\nversion = "1.0.0"\n');
				if (url.includes('graphql')) return new Response('', { status: 401 });
				return json({ data: [zed('a', '')] });
			});
			await runSync({
				env: backupEnv,
				log: silent,
				deps: d,
				put: write,
				onlyIfHistoryMissing: true
			}).catch(() => {});
			const [, , options] = write.mock.calls.find(([path]) => path.startsWith('history/'))!;
			expect(options).toMatchObject({ allowOverwrite: false });
			const urls = d.fetch.mock.calls.map(([url]) => String(url));
			expect(urls.some((u) => u.startsWith('https://blob.test/extensions.json'))).toBe(true);
		});
	});
});
