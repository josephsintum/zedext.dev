import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Snapshot, ZedExtension } from '../types.js';

const fetchSnapshot = vi.fn<(url: string) => Promise<Snapshot>>();
const getAllExtensions = vi.fn<() => Promise<ZedExtension[]>>();

vi.mock('$env/dynamic/private', () => ({
	env: { SNAPSHOT_URL: 'https://blob.test/extensions.json' }
}));
vi.mock('./sync.js', async (importOriginal) => ({
	...(await importOriginal<typeof import('./sync.js')>()),
	fetchSnapshot: (url: string) => fetchSnapshot(url)
}));
vi.mock('./zed-api.js', () => ({ getAllExtensions: () => getAllExtensions() }));

const zedExt = (id: string): ZedExtension => ({
	id,
	name: id,
	version: '1.0.0',
	description: null,
	authors: [],
	repository: '',
	schema_version: 1,
	wasm_api_version: null,
	provides: [],
	published_at: '2026-01-01T00:00:00Z',
	download_count: 1
});

const blobSnapshot = (generatedAt: string, ids = ['a', 'b']): Snapshot => ({
	generatedAt,
	extensions: ids.map((id) => ({
		id,
		name: id,
		description: null,
		authors: [],
		provides: [],
		download_count: 1,
		github_stars: 0,
		github_license: null,
		github_pushed_at: null,
		published_at: '2026-01-01T00:00:00Z',
		first_published_at: null,
		version: '1.0.0',
		repository: null
	}))
});

// Module state (the cached snapshot) must start empty for each test
const load = async () => (await import('./snapshot.js')).getSnapshot;
const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
	vi.resetModules();
	vi.useFakeTimers({ toFake: ['Date'] });
	vi.spyOn(console, 'error').mockImplementation(() => {});
	fetchSnapshot.mockReset();
	getAllExtensions.mockReset();
});

afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
});

describe('getSnapshot', () => {
	it('does not keep an empty fallback, and recovers once Blob is back', async () => {
		const getSnapshot = await load();
		fetchSnapshot.mockRejectedValueOnce(new Error('blob down'));
		getAllExtensions.mockResolvedValueOnce([]);
		await expect(getSnapshot()).rejects.toThrow(/no extensions/);

		fetchSnapshot.mockResolvedValueOnce(blobSnapshot('v1'));
		const loaded = await getSnapshot();
		expect(loaded).toMatchObject({ degraded: false, snapshot: { generatedAt: 'v1' } });
	});

	it('rebuilds a degraded snapshot from Zed when Blob is still down', async () => {
		const getSnapshot = await load();
		fetchSnapshot.mockRejectedValue(new Error('blob down'));
		getAllExtensions.mockResolvedValueOnce([zedExt('old')]);
		expect((await getSnapshot()).snapshot.extensions.map((e) => e.id)).toEqual(['old']);

		vi.advanceTimersByTime(61_000);
		getAllExtensions.mockResolvedValueOnce([zedExt('new')]);
		await getSnapshot(); // returns the stale copy and refreshes in the background
		await flush();
		expect((await getSnapshot()).snapshot.extensions.map((e) => e.id)).toEqual(['new']);
	});

	it('keeps the last real snapshot when Blob fails later', async () => {
		const getSnapshot = await load();
		fetchSnapshot.mockResolvedValueOnce(blobSnapshot('v1'));
		await getSnapshot();

		vi.advanceTimersByTime(11 * 60_000);
		fetchSnapshot.mockRejectedValueOnce(new Error('blob down'));
		await getSnapshot();
		await flush();
		expect(getAllExtensions).not.toHaveBeenCalled();
		expect((await getSnapshot()).snapshot.generatedAt).toBe('v1');
	});

	it('serves the expired copy immediately while refreshing in the background', async () => {
		const getSnapshot = await load();
		fetchSnapshot.mockResolvedValueOnce(blobSnapshot('v1'));
		await getSnapshot();

		vi.advanceTimersByTime(11 * 60_000);
		let resolveRefresh!: (s: Snapshot) => void;
		fetchSnapshot.mockReturnValueOnce(new Promise((r) => (resolveRefresh = r)));
		expect((await getSnapshot()).snapshot.generatedAt).toBe('v1');

		resolveRefresh(blobSnapshot('v2'));
		await flush();
		expect((await getSnapshot()).snapshot.generatedAt).toBe('v2');
	});

	it('reuses the built index when the snapshot has not changed', async () => {
		const getSnapshot = await load();
		fetchSnapshot.mockResolvedValue(blobSnapshot('v1'));
		const first = await getSnapshot();

		vi.advanceTimersByTime(11 * 60_000);
		await getSnapshot();
		await flush();
		expect((await getSnapshot()).index).toBe(first.index);
	});
});
