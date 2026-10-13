import { describe, expect, it } from 'vitest';
import {
	COLLECTION_REDIRECTS,
	COLLECTIONS,
	getCollection,
	resolveCollection,
	type Collection
} from './collections.js';
import type { PreviewBundle, ThemeVariant } from './theme-preview.js';
import type { ExtensionRecord } from './types.js';

function record(o: Partial<ExtensionRecord> & { id: string }): ExtensionRecord {
	return {
		name: o.id,
		description: null,
		authors: [],
		provides: [],
		download_count: 0,
		github_stars: 0,
		github_license: null,
		github_pushed_at: null,
		published_at: '2026-01-01T00:00:00Z',
		first_published_at: null,
		version: '1.0.0',
		repository: null,
		...o
	};
}

const variant = (appearance: 'dark' | 'light') =>
	({ name: appearance, appearance, colors: {} }) as ThemeVariant;
const previews = (themes: Record<string, ('dark' | 'light')[]>): PreviewBundle => ({
	generatedAt: '2026-10-13T00:00:00Z',
	icons: {},
	themes: Object.fromEntries(
		Object.entries(themes).map(([id, as]) => [id, { version: '1', variants: as.map(variant) }])
	)
});

const web: Collection = {
	slug: 'web',
	title: 'Web',
	emoji: '🌐',
	description: '',
	section: 'stacks',
	match: { keywords: ['vue', 'svelte', 'html'] }
};

describe('COLLECTIONS', () => {
	it('have unique slugs that are not redirected', () => {
		const slugs = COLLECTIONS.map((c) => c.slug);
		expect(new Set(slugs).size).toBe(slugs.length);
		for (const s of slugs) expect(Object.hasOwn(COLLECTION_REDIRECTS, s)).toBe(false);
	});

	it('redirect the old language setups to their language pages', () => {
		expect(COLLECTION_REDIRECTS).toEqual({
			'python-setup': '/languages/python',
			'rust-setup': '/languages/rust'
		});
	});

	it('look up by slug without matching prototype keys', () => {
		expect(getCollection('web-dev')?.title).toBe('Web development');
		expect(getCollection('constructor')).toBeUndefined();
	});
});

describe('resolveCollection', () => {
	it('ranks keyword matches by downloads and counts the total', () => {
		const records = [
			record({ id: 'svelte', download_count: 10 }),
			record({ id: 'vue', download_count: 30 }),
			record({ id: 'go', download_count: 99 })
		];
		expect(resolveCollection(web, records, null)).toEqual({
			items: [records[1], records[0]],
			total: 2
		});
	});

	it('leaves themes, icon themes, MCP and agent servers out of keyword rules by default', () => {
		const records = [
			record({ id: 'vue' }),
			record({ id: 'vue-theme', provides: ['themes'] }),
			record({ id: 'svelte-mcp', provides: ['context-servers'] }),
			record({ id: 'html-agent', provides: ['agent-servers'] }),
			record({ id: 'vue-icons', provides: ['icon-themes'] })
		];
		expect(resolveCollection(web, records, null).items.map((r) => r.id)).toEqual(['vue']);
	});

	it('honors an explicit excludeProvides', () => {
		const c = { ...web, match: { keywords: ['vue'], excludeProvides: [] } };
		const records = [record({ id: 'vue-theme', provides: ['themes'] })];
		expect(resolveCollection(c, records, null).total).toBe(1);
	});

	it('matches provides rules', () => {
		const c: Collection = { ...web, match: { provides: ['context-servers'] } };
		const records = [record({ id: 'a', provides: ['context-servers'] }), record({ id: 'b' })];
		expect(resolveCollection(c, records, null).items.map((r) => r.id)).toEqual(['a']);
	});

	it('puts pins first in their order, once, and skips pins missing from the snapshot', () => {
		const c = { ...web, pin: ['svelte', 'gone', 'pinned-other'] };
		const records = [
			record({ id: 'vue', download_count: 30 }),
			record({ id: 'svelte', download_count: 10 }),
			record({ id: 'pinned-other', download_count: 1 })
		];
		const { items, total } = resolveCollection(c, records, null);
		expect(items.map((r) => r.id)).toEqual(['svelte', 'pinned-other', 'vue']);
		expect(total).toBe(3);
	});

	it('never shows hidden ids, even pinned ones', () => {
		const c = { ...web, pin: ['vue'], hide: ['vue', 'html'] };
		const records = [record({ id: 'vue' }), record({ id: 'html' }), record({ id: 'svelte' })];
		expect(resolveCollection(c, records, null).items.map((r) => r.id)).toEqual(['svelte']);
	});

	it('caps items at the limit but reports the full total', () => {
		const records = ['vue', 'svelte', 'html'].map((id) => record({ id }));
		expect(resolveCollection(web, records, null, 2)).toMatchObject({ total: 3 });
		expect(resolveCollection(web, records, null, 2).items).toHaveLength(2);
	});

	it('matches theme collections by preview appearance', () => {
		const dark = getCollection('dark-themes')!;
		const light = getCollection('light-themes')!;
		const records = [
			record({ id: 'both', provides: ['themes'], download_count: 2 }),
			record({ id: 'dark', provides: ['themes'], download_count: 1 }),
			record({ id: 'no-preview', provides: ['themes'], download_count: 9 }),
			record({ id: 'constructor', provides: ['themes'] })
		];
		const p = previews({ both: ['light', 'dark'], dark: ['dark'] });
		expect(resolveCollection(dark, records, p).items.map((r) => r.id)).toEqual(['both', 'dark']);
		expect(resolveCollection(light, records, p).items.map((r) => r.id)).toEqual(['both']);
	});

	it('returns nothing for theme collections when previews are unavailable', () => {
		const records = [record({ id: 'dark', provides: ['themes'] })];
		expect(resolveCollection(getCollection('dark-themes')!, records, null)).toEqual({
			items: [],
			total: 0
		});
	});
});
