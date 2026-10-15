import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { changedUrls, INDEXNOW_KEY, submitToIndexNow } from './indexnow.js';
import type { ExtensionRecord, Snapshot } from '../types.js';

const rec = (id: string, version: string, stars = 0) =>
	({ id, version, github_stars: stars }) as ExtensionRecord;
const snap = (...extensions: ExtensionRecord[]): Snapshot => ({ generatedAt: '', extensions });
const page = (id: string) => `https://zedext.dev/extensions/${id}`;

describe('changedUrls', () => {
	const previous = snap(rec('a', '1.0.0'), rec('b', '2.0.0'), rec('gone', '1.0.0'));

	it('lists new, updated and removed extensions', () => {
		const now = [rec('a', '1.0.0'), rec('b', '2.1.0'), rec('new', '0.1.0')];
		expect(changedUrls(now, previous)).toEqual([page('b'), page('new'), page('gone')]);
	});

	it('ignores star and download changes', () => {
		const now = [rec('a', '1.0.0', 99), rec('b', '2.0.0', 5), rec('gone', '1.0.0')];
		expect(changedUrls(now, previous)).toEqual([]);
	});

	it('sends nothing without a previous snapshot (the sitemap has every page)', () => {
		expect(changedUrls([rec('a', '1.0.0')], null)).toEqual([]);
	});

	it('encodes ids in URLs', () => {
		expect(changedUrls([rec('a b', '1')], snap())).toContain(page('a%20b'));
	});
});

describe('submitToIndexNow', () => {
	const deps = (respond: () => Response | Promise<Response>) => ({
		fetch: vi.fn(async () => respond()),
		sleep: async () => {}
	});
	const silent = () => {};

	it('posts the host, key, key file and URLs', async () => {
		const d = deps(() => new Response('', { status: 202 }));
		expect(await submitToIndexNow([page('a')], silent, d)).toBe(1);
		const [url, init] = d.fetch.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe('https://api.indexnow.org/indexnow');
		expect(JSON.parse(String(init.body))).toEqual({
			host: 'zedext.dev',
			key: INDEXNOW_KEY,
			keyLocation: `https://zedext.dev/${INDEXNOW_KEY}.txt`,
			urlList: [page('a')]
		});
	});

	it('makes no request for an empty list', async () => {
		const d = deps(() => new Response(''));
		expect(await submitToIndexNow([], silent, d)).toBe(0);
		expect(d.fetch).not.toHaveBeenCalled();
	});

	it('returns 0 without throwing when refused or offline', async () => {
		const log = vi.fn();
		expect(
			await submitToIndexNow(
				[page('a')],
				log,
				deps(() => new Response('', { status: 403 }))
			)
		).toBe(0);
		expect(log).toHaveBeenCalledWith('IndexNow refused 1 URLs (403)');
		const offline = deps(() => Promise.reject(new Error('network down')));
		expect(await submitToIndexNow([page('a')], silent, offline)).toBe(0);
	});
});

describe('key file', () => {
	it('is served from static/ with exactly the key', () => {
		const file = new URL(`../../../static/${INDEXNOW_KEY}.txt`, import.meta.url);
		expect(readFileSync(file, 'utf8')).toBe(INDEXNOW_KEY);
	});
});
