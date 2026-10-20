import { describe, expect, it } from 'vitest';
import { searchIndex } from './engine.js';
import { createIndex } from './create-index.js';
import type { ExtensionRecord } from '$lib/types.js';

function record(overrides: Partial<ExtensionRecord> & { id: string }): ExtensionRecord {
	return {
		name: overrides.id,
		description: null,
		authors: [],
		provides: ['languages'],
		download_count: 0,
		github_stars: 0,
		github_license: null,
		github_pushed_at: null,
		published_at: '2026-01-01T00:00:00Z',
		first_published_at: null,
		version: '1.0.0',
		repository: null,
		...overrides
	};
}

const records: ExtensionRecord[] = [
	record({ id: 'html', name: 'HTML', description: 'HTML support.', download_count: 7_000_000 }),
	record({
		id: 'python-lsp',
		name: 'Python LSP',
		description: 'Python language server',
		download_count: 50_000,
		github_stars: 900,
		published_at: '2026-09-01T00:00:00Z'
	}),
	record({
		id: 'pyright-extra',
		name: 'Pyright Extra',
		description: 'Extra Python tooling',
		download_count: 10_000,
		github_stars: 10
	}),
	record({
		id: 'catppuccin',
		name: 'Catppuccin',
		description: 'Soothing pastel theme',
		provides: ['themes'],
		download_count: 1_000_000,
		github_stars: 5,
		github_pushed_at: '2026-10-01T00:00:00Z'
	}),
	record({
		id: 'one-dark-pro',
		name: 'One Dark Pro',
		description: 'Dark theme',
		provides: ['themes', 'icon-themes'],
		download_count: 400_000,
		github_stars: 3000
	})
];

const index = createIndex(records);
const ids = (r: { hits: ExtensionRecord[] }) => r.hits.map((h) => h.id);

describe('searchIndex', () => {
	it('returns everything by downloads when the query is empty', () => {
		const r = searchIndex(index, '');
		expect(ids(r)).toEqual(['html', 'catppuccin', 'one-dark-pro', 'python-lsp', 'pyright-extra']);
		expect(r.nbHits).toBe(5);
	});

	it('tolerates typos', () => {
		expect(ids(searchIndex(index, 'pyhton'))).toContain('python-lsp');
		expect(ids(searchIndex(index, 'catpuccin'))[0]).toBe('catppuccin');
	});

	it('matches prefixes for search-as-you-type', () => {
		expect(ids(searchIndex(index, 'catp'))[0]).toBe('catppuccin');
	});

	it('ranks a name match above a description match', () => {
		expect(ids(searchIndex(index, 'python'))[0]).toBe('python-lsp');
	});

	it('filters by category and counts facets over all query matches', () => {
		const r = searchIndex(index, 'theme', { category: 'icon-themes' });
		expect(ids(r)).toEqual(['one-dark-pro']);
		expect(r.facets.provides).toEqual({ themes: 2, 'icon-themes': 1 });
	});

	it('sorts across all matches before paginating', () => {
		const page0 = searchIndex(index, '', { sort: 'stars', hitsPerPage: 2 });
		expect(ids(page0)).toEqual(['one-dark-pro', 'python-lsp']);
		const page1 = searchIndex(index, '', { sort: 'stars', hitsPerPage: 2, page: 1 });
		expect(ids(page1)).toEqual(['pyright-extra', 'catppuccin']);
	});

	it('sorts by latest release; a later commit alone (catppuccin) doesn’t count', () => {
		expect(ids(searchIndex(index, '', { sort: 'updated' }))[0]).toBe('python-lsp');
	});

	it('sorts by name, ignoring leading emoji', () => {
		const withEmoji = createIndex([...records, record({ id: 'aaa', name: '🌌 Zebra' })]);
		const sorted = ids(searchIndex(withEmoji, '', { sort: 'name' }));
		expect(sorted[0]).toBe('catppuccin');
		expect(sorted.at(-1)).toBe('aaa');
	});

	it('reports pagination', () => {
		const r = searchIndex(index, '', { hitsPerPage: 2, page: 2 });
		expect(r).toMatchObject({ nbHits: 5, nbPages: 3, page: 2 });
		expect(ids(r)).toEqual(['pyright-extra']);
	});

	it('keeps a name match above description matches when the description has a near-miss word', () => {
		const idx = createIndex([
			record({
				id: 'catppuccin-theme',
				name: 'Catppuccin Theme',
				description: 'One of these pastel flavours',
				download_count: 900_000
			}),
			record({ id: 'random-thing', name: 'Random Thing', description: 'A minimal theme' })
		]);
		expect(ids(searchIndex(idx, 'theme'))).toEqual(['catppuccin-theme', 'random-thing']);
	});

	it('ignores unknown or prototype sort keys', () => {
		for (const sort of ['__proto__', 'valueOf', 'constructor', 'bogus']) {
			expect(ids(searchIndex(index, '', { sort }))).toEqual(ids(searchIndex(index, '')));
		}
	});

	it('returns no hits for nonsense', () => {
		expect(searchIndex(index, 'zzzzqqq').nbHits).toBe(0);
	});
});
