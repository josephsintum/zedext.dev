import { describe, expect, it } from 'vitest';
import {
	browseAllHref,
	DISCOVER_LISTS,
	getDiscoverList,
	resolveList,
	type DiscoverList
} from './discover.js';
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

const web: DiscoverList = {
	slug: 'web',
	title: 'Web',
	emoji: '🌐',
	description: '',
	section: 'stacks',
	match: { keywords: ['vue', 'svelte', 'html'] }
};

describe('DISCOVER_LISTS', () => {
	it('have unique slugs', () => {
		const slugs = DISCOVER_LISTS.map((c) => c.slug);
		expect(new Set(slugs).size).toBe(slugs.length);
	});

	it('look up by slug without matching prototype keys', () => {
		expect(getDiscoverList('web-dev')?.title).toBe('Web development');
		expect(getDiscoverList('constructor')).toBeUndefined();
	});
});

describe('resolveList', () => {
	it('ranks keyword matches by downloads and counts the total', () => {
		const records = [
			record({ id: 'svelte', download_count: 10 }),
			record({ id: 'vue', download_count: 30 }),
			record({ id: 'go', download_count: 99 })
		];
		expect(resolveList(web, records, null)).toEqual({
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
		expect(resolveList(web, records, null).items.map((r) => r.id)).toEqual(['vue']);
	});

	it('honors an explicit excludeProvides', () => {
		const c = { ...web, match: { keywords: ['vue'], excludeProvides: [] } };
		const records = [record({ id: 'vue-theme', provides: ['themes'] })];
		expect(resolveList(c, records, null).total).toBe(1);
	});

	it('matches provides rules', () => {
		const c: DiscoverList = { ...web, match: { provides: ['context-servers'] } };
		const records = [record({ id: 'a', provides: ['context-servers'] }), record({ id: 'b' })];
		expect(resolveList(c, records, null).items.map((r) => r.id)).toEqual(['a']);
	});

	it('puts pins first in their order, once, and skips pins missing from the snapshot', () => {
		const c = { ...web, pin: ['svelte', 'gone', 'pinned-other'] };
		const records = [
			record({ id: 'vue', download_count: 30 }),
			record({ id: 'svelte', download_count: 10 }),
			record({ id: 'pinned-other', download_count: 1 })
		];
		const { items, total } = resolveList(c, records, null);
		expect(items.map((r) => r.id)).toEqual(['svelte', 'pinned-other', 'vue']);
		expect(total).toBe(3);
	});

	it('never shows hidden ids, even pinned ones', () => {
		const c = { ...web, pin: ['vue'], hide: ['vue', 'html'] };
		const records = [record({ id: 'vue' }), record({ id: 'html' }), record({ id: 'svelte' })];
		expect(resolveList(c, records, null).items.map((r) => r.id)).toEqual(['svelte']);
	});

	it('caps items at the limit but reports the full total', () => {
		const records = ['vue', 'svelte', 'html'].map((id) => record({ id }));
		expect(resolveList(web, records, null, 2)).toMatchObject({ total: 3 });
		expect(resolveList(web, records, null, 2).items).toHaveLength(2);
	});

	it('matches theme lists by preview appearance', () => {
		const dark = getDiscoverList('dark-themes')!;
		const light = getDiscoverList('light-themes')!;
		const records = [
			record({ id: 'both', provides: ['themes'], download_count: 2 }),
			record({ id: 'dark', provides: ['themes'], download_count: 1 }),
			record({ id: 'no-preview', provides: ['themes'], download_count: 9 }),
			record({ id: 'constructor', provides: ['themes'] })
		];
		const p = previews({ both: ['light', 'dark'], dark: ['dark'] });
		expect(resolveList(dark, records, p).items.map((r) => r.id)).toEqual(['both', 'dark']);
		expect(resolveList(light, records, p).items.map((r) => r.id)).toEqual(['both']);
	});

	it('returns nothing for theme lists when previews are unavailable', () => {
		const records = [record({ id: 'dark', provides: ['themes'] })];
		expect(resolveList(getDiscoverList('dark-themes')!, records, null)).toEqual({
			items: [],
			total: 0
		});
	});
});

describe('browseAllHref', () => {
	it('points lists that can outgrow their limit at the full category page', () => {
		expect(browseAllHref(getDiscoverList('mcp-servers')!)).toBe('/mcp-servers');
		expect(browseAllHref(getDiscoverList('dark-themes')!)).toBe('/themes');
		expect(browseAllHref(getDiscoverList('light-themes')!)).toBe('/themes');
	});

	it('is null for keyword lists, which have no category page', () => {
		expect(browseAllHref(getDiscoverList('web-dev')!)).toBeNull();
	});
});
