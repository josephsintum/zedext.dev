import { describe, expect, it, vi } from 'vitest';
import {
	buildPreviews,
	loadPreviousPreviews,
	PREVIEW_FORMAT,
	previewsShrank
} from './previews-sync.js';
import { tarGz } from './testing/tar.js';
import type { ExtensionRecord } from '$lib/types.js';
import { themeColors, type PreviewBundle } from '$lib/theme-preview.js';

const rec = (id: string, provides: string[], version = '1.0.0'): ExtensionRecord => ({
	id,
	name: id,
	description: null,
	authors: [],
	provides,
	download_count: 0,
	github_stars: 0,
	github_license: null,
	github_pushed_at: null,
	published_at: '2026-01-01T00:00:00Z',
	first_published_at: null,
	version,
	repository: null
});

const themeJson = (bg: string) =>
	JSON.stringify({
		themes: [
			{
				name: 'V',
				appearance: 'dark',
				style: { 'editor.background': bg, 'editor.foreground': '#ffffff', syntax: {} }
			}
		]
	});
const iconJson = JSON.stringify({
	themes: [
		{
			name: 'I',
			appearance: 'dark',
			directory_icons: { collapsed: './icons/f.svg' },
			file_suffixes: {},
			file_icons: {}
		}
	]
});

function deps(archives: Record<string, Uint8Array<ArrayBuffer> | number>) {
	const fetch = vi.fn(async (input: string | URL | Request, _init?: RequestInit) => {
		const id = String(input).match(/extensions\/([^/]+)\/download/)![1];
		const a = archives[id];
		return typeof a === 'number' ? new Response('', { status: a }) : new Response(a);
	});
	return { fetch, sleep: async () => {} };
}
const silent = () => {};
const empty: PreviewBundle = { generatedAt: '', themes: {}, icons: {} };

describe('buildPreviews time limits', () => {
	it('gives up on a download that hangs, keeping the previous entry', async () => {
		const previous: PreviewBundle = {
			...empty,
			format: PREVIEW_FORMAT,
			themes: { a: { version: '0.9.0', variants: [] } }
		};
		const hang = {
			fetch: vi.fn(
				(_input: string | URL | Request, init?: RequestInit) =>
					new Promise<Response>((_resolve, reject) =>
						init?.signal?.addEventListener('abort', () => reject(init.signal!.reason))
					)
			),
			sleep: async () => {}
		};
		const { bundle, failed } = await buildPreviews([rec('a', ['themes'])], previous, {
			limit: 10,
			log: silent,
			deps: hang,
			timeoutMs: 20
		});
		expect(failed).toBe(1);
		expect(bundle.themes.a.version).toBe('0.9.0');
	});

	it('starts no downloads after the deadline and leaves them for later runs', async () => {
		const d = deps({ a: tarGz({ 'themes/a.json': themeJson('#aaaaaa') }) });
		const { downloaded, pending } = await buildPreviews([rec('a', ['themes'])], null, {
			limit: 10,
			log: silent,
			deps: d,
			deadline: Date.now() - 1
		});
		expect(downloaded).toBe(0);
		expect(pending).toBe(1);
		expect(d.fetch).not.toHaveBeenCalled();
	});

	it('re-downloads entries from an older bundle format, but keeps them until then', async () => {
		const previous: PreviewBundle = {
			...empty,
			format: PREVIEW_FORMAT - 1,
			themes: { a: { version: '1.0.0', variants: [] } }
		};
		const d = deps({});
		const { bundle, pending } = await buildPreviews([rec('a', ['themes'])], previous, {
			limit: 0,
			log: silent,
			deps: d
		});
		expect(pending).toBe(1); // stale because of the format, even though the version matches
		expect(bundle.themes.a.version).toBe('1.0.0');
	});

	it('keeps migrating old-format themes on later runs, without re-downloading icon themes', async () => {
		const legacy: PreviewBundle = {
			...empty,
			format: PREVIEW_FORMAT - 1,
			themes: {
				a: { version: '1.0.0', variants: [] },
				b: { version: '1.0.0', variants: [] }
			},
			icons: { c: { version: '1.0.0', variants: [] } }
		};
		const records = [rec('a', ['themes']), rec('b', ['themes']), rec('c', ['icon-themes'])];
		const d = deps({
			a: tarGz({ 'themes/a.json': themeJson('#aaaaaa') }),
			b: tarGz({ 'themes/b.json': themeJson('#bbbbbb') })
		});
		const opts = { limit: 1, log: silent, deps: d };

		const night1 = await buildPreviews(records, legacy, opts);
		expect(night1.downloaded).toBe(1);
		const night2 = await buildPreviews(records, night1.bundle, opts);
		expect(night2.downloaded).toBe(1);
		const night3 = await buildPreviews(records, night2.bundle, opts);

		expect(night3.downloaded).toBe(0);
		expect(night3.pending).toBe(0);
		expect(themeColors(night3.bundle.themes.a.variants[0]).bg).toBe('#aaaaaa');
		expect(themeColors(night3.bundle.themes.b.variants[0]).bg).toBe('#bbbbbb');
		const urls = d.fetch.mock.calls.map(([u]) => String(u));
		expect(urls.some((u) => u.includes('/c/'))).toBe(false); // icon parsing didn't change
		expect(night3.bundle.icons.c.version).toBe('1.0.0');
	});
});

describe('loadPreviousPreviews', () => {
	const at = (res: Response | Error) => async () => {
		if (res instanceof Error) throw res;
		return res;
	};

	it('treats a missing bundle (404) as a fresh start', async () => {
		expect(
			await loadPreviousPreviews('https://x/b.json', at(new Response('', { status: 404 })))
		).toEqual({ ok: true, bundle: null });
	});

	it('returns a well-formed bundle', async () => {
		const bundle = { ...empty, themes: {}, icons: {} };
		expect(await loadPreviousPreviews('https://x/b.json', at(Response.json(bundle)))).toEqual({
			ok: true,
			bundle
		});
	});

	it('reports failure for errors, other statuses and malformed bundles, so the sync skips previews', async () => {
		for (const res of [
			new Response('', { status: 503 }),
			Response.json({ nope: 1 }),
			new Error('network')
		]) {
			expect((await loadPreviousPreviews('https://x/b.json', at(res))).ok).toBe(false);
		}
	});
});

describe('previewsShrank', () => {
	const withThemes = (n: number): PreviewBundle => ({
		...empty,
		themes: Object.fromEntries(
			Array.from({ length: n }, (_, i) => [`t${i}`, { version: '1', variants: [] }])
		)
	});
	it('flags a bundle that lost more than 10% of the previous themes', () => {
		expect(previewsShrank(withThemes(80), withThemes(100))).toBe(true);
		expect(previewsShrank(withThemes(95), withThemes(100))).toBe(false);
		expect(previewsShrank(withThemes(10), null)).toBe(false);
	});
});

describe('buildPreviews', () => {
	it('downloads themes and icon themes and extracts their previews', async () => {
		const d = deps({
			dark: tarGz({ './themes/dark.json': themeJson('#111111') }),
			icons: tarGz({ './icon_themes/i.json': iconJson, './icons/f.svg': '<svg/>' })
		});
		const { bundle, downloaded } = await buildPreviews(
			[rec('dark', ['themes']), rec('icons', ['icon-themes']), rec('lsp', ['language-servers'])],
			null,
			{ limit: 10, log: silent, deps: d }
		);
		expect(downloaded).toBe(2);
		expect(themeColors(bundle.themes.dark.variants[0]).bg).toBe('#111111');
		expect(bundle.icons.icons.variants[0].folder).toBe('<svg/>');
		expect(d.fetch).toHaveBeenCalledTimes(2); // never for non-theme extensions
		expect(d.fetch.mock.calls[0][1]).toMatchObject({
			headers: { 'User-Agent': expect.stringContaining('zedext-sync') }
		});
	});

	it('reuses previews whose version is unchanged, without downloading', async () => {
		const previous: PreviewBundle = {
			...empty,
			format: PREVIEW_FORMAT,
			themes: { dark: { version: '1.0.0', variants: [] } }
		};
		const d = deps({});
		const { bundle, downloaded } = await buildPreviews([rec('dark', ['themes'])], previous, {
			limit: 10,
			log: silent,
			deps: d
		});
		expect(downloaded).toBe(0);
		expect(d.fetch).not.toHaveBeenCalled();
		expect(bundle.themes.dark.version).toBe('1.0.0');
	});

	it('stops at the download limit and keeps stale entries for the rest', async () => {
		const previous: PreviewBundle = { ...empty, themes: { b: { version: '0.9.0', variants: [] } } };
		const d = deps({
			a: tarGz({ 'themes/a.json': themeJson('#aaaaaa') }),
			b: tarGz({ 'themes/b.json': themeJson('#bbbbbb') })
		});
		const { bundle, downloaded, pending } = await buildPreviews(
			[rec('a', ['themes']), rec('b', ['themes']), rec('c', ['themes'])],
			previous,
			{ limit: 1, log: silent, deps: d }
		);
		expect(downloaded).toBe(1);
		expect(pending).toBe(2);
		expect(themeColors(bundle.themes.a.variants[0]).bg).toBe('#aaaaaa');
		expect(bundle.themes.b.version).toBe('0.9.0'); // stale but kept
		expect(bundle.themes.c).toBeUndefined();
	});

	it('keeps the previous entry when a download fails', async () => {
		const previous: PreviewBundle = { ...empty, themes: { a: { version: '0.9.0', variants: [] } } };
		const { bundle, failed } = await buildPreviews([rec('a', ['themes'])], previous, {
			limit: 10,
			log: silent,
			deps: deps({ a: 404 })
		});
		expect(failed).toBe(1);
		expect(bundle.themes.a.version).toBe('0.9.0');
	});

	it('records nothing for an archive with no usable theme', async () => {
		const { bundle } = await buildPreviews([rec('broken', ['themes'])], null, {
			limit: 10,
			log: silent,
			deps: deps({ broken: tarGz({ 'themes/x.json': '{"themes":[{"style":{}}]}' }) })
		});
		expect(bundle.themes.broken).toBeUndefined();
	});
});
