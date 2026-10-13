import { describe, expect, it, vi } from 'vitest';
import { buildPreviews } from './previews-sync.js';
import { tarGz } from './testing/tar.js';
import type { ExtensionRecord } from '$lib/types.js';
import type { PreviewBundle } from '$lib/theme-preview.js';

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
		expect(bundle.themes.dark.variants[0].colors.bg).toBe('#111111');
		expect(bundle.icons.icons.variants[0].folder).toBe('<svg/>');
		expect(d.fetch).toHaveBeenCalledTimes(2); // never for non-theme extensions
		expect(d.fetch.mock.calls[0][1]).toMatchObject({
			headers: { 'User-Agent': expect.stringContaining('zedext-sync') }
		});
	});

	it('reuses previews whose version is unchanged, without downloading', async () => {
		const previous: PreviewBundle = {
			...empty,
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
		expect(bundle.themes.a.variants[0].colors.bg).toBe('#aaaaaa');
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
