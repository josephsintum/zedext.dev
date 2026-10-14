import { describe, expect, it } from 'vitest';
import {
	browseAll,
	discoverRedirect,
	GUIDE_LISTS,
	getGuideList,
	resolveList,
	type GuideList
} from './guides.js';
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

const web: GuideList = {
	slug: 'web',
	title: 'Web',
	emoji: '🌐',
	description: '',
	match: { keywords: ['vue', 'svelte', 'html'] }
};

describe('GUIDE_LISTS', () => {
	it('have unique slugs', () => {
		const slugs = GUIDE_LISTS.map((c) => c.slug);
		expect(new Set(slugs).size).toBe(slugs.length);
	});

	it('look up by slug without matching prototype keys', () => {
		expect(getGuideList('dark-themes')).toBeUndefined();
		expect(getGuideList('web-frontend')?.title).toBe('Web frontend');
		expect(getGuideList('constructor')).toBeUndefined();
	});
});

describe('resolveList', () => {
	it('ranks keyword matches by downloads and counts the total', () => {
		const records = [
			record({ id: 'svelte', download_count: 10 }),
			record({ id: 'vue', download_count: 30 }),
			record({ id: 'go', download_count: 99 })
		];
		expect(resolveList(web, records)).toEqual({
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
		expect(resolveList(web, records).items.map((r) => r.id)).toEqual(['vue']);
	});

	it('honors an explicit excludeProvides', () => {
		const c = { ...web, match: { keywords: ['vue'], excludeProvides: [] } };
		const records = [record({ id: 'vue-theme', provides: ['themes'] })];
		expect(resolveList(c, records).total).toBe(1);
	});

	it('matches provides rules', () => {
		const c: GuideList = { ...web, match: { provides: ['context-servers'] } };
		const records = [record({ id: 'a', provides: ['context-servers'] }), record({ id: 'b' })];
		expect(resolveList(c, records).items.map((r) => r.id)).toEqual(['a']);
	});

	it('puts pins first in their order, once, and skips pins missing from the snapshot', () => {
		const c = { ...web, pin: ['svelte', 'gone', 'pinned-other'] };
		const records = [
			record({ id: 'vue', download_count: 30 }),
			record({ id: 'svelte', download_count: 10 }),
			record({ id: 'pinned-other', download_count: 1 })
		];
		const { items, total } = resolveList(c, records);
		expect(items.map((r) => r.id)).toEqual(['svelte', 'pinned-other', 'vue']);
		expect(total).toBe(3);
	});

	it('never shows hidden ids, even pinned ones', () => {
		const c = { ...web, pin: ['vue'], hide: ['vue', 'html'] };
		const records = [record({ id: 'vue' }), record({ id: 'html' }), record({ id: 'svelte' })];
		expect(resolveList(c, records).items.map((r) => r.id)).toEqual(['svelte']);
	});

	it('caps items at the limit but reports the full total', () => {
		const records = ['vue', 'svelte', 'html'].map((id) => record({ id }));
		expect(resolveList(web, records, 2)).toMatchObject({ total: 3 });
		expect(resolveList(web, records, 2).items).toHaveLength(2);
	});
});

describe('browseAll', () => {
	it('points lists that can outgrow their limit at the full category page', () => {
		expect(browseAll(getGuideList('ai-agents')!)).toEqual({
			href: '/mcp-servers',
			label: 'MCP servers for Zed'
		});
	});

	it('is null for keyword lists, which have no category page', () => {
		expect(browseAll(getGuideList('web-frontend')!)).toBeNull();
		expect(browseAll(getGuideList('vscode')!)).toBeNull();
	});
});

describe('guides', () => {
	it('each say what Zed has built in', () => {
		for (const list of GUIDE_LISTS) {
			expect(list.builtIn?.length, list.slug).toBeGreaterThan(0);
		}
	});

	it('match a fixed id list ranked by downloads, skipping ids missing from the snapshot', () => {
		const c: GuideList = { ...web, match: { ids: ['a', 'b', 'gone'] } };
		const records = [
			record({ id: 'a', provides: ['themes'], download_count: 1 }),
			record({ id: 'b', provides: ['icon-themes'], download_count: 5 }),
			record({ id: 'c', download_count: 9 })
		];
		expect(resolveList(c, records)).toEqual({ items: [records[1], records[0]], total: 2 });
	});

	it('ignore prototype keys in id lists', () => {
		const c: GuideList = { ...web, match: { ids: ['a'] } };
		expect(resolveList(c, [record({ id: 'constructor' })]).total).toBe(0);
	});
});

describe('discoverRedirect', () => {
	it('sends old /discover URLs to where they moved', () => {
		expect(discoverRedirect('', '')).toBe('/');
		expect(discoverRedirect('themes', '?appearance=light&theme=x')).toBe(
			'/themes?appearance=light&theme=x'
		);
		expect(discoverRedirect('themes.json', '?appearance=dark')).toBe(
			'/themes.json?appearance=dark'
		);
		expect(discoverRedirect('themes/catppuccin.json', '')).toBe('/themes/catppuccin.json');
		expect(discoverRedirect('vim', '')).toBe('/guides/vim');
	});

	it('re-encodes theme ids, which arrive decoded', () => {
		expect(discoverRedirect('themes/a#b.json', '')).toBe('/themes/a%23b.json');
		expect(discoverRedirect('themes/a\r\nb.json', '')).toBe('/themes/a%0D%0Ab.json');
	});

	it('is null for URLs that never existed', () => {
		expect(discoverRedirect('nope', '')).toBeNull();
		expect(discoverRedirect('themes/a/b.json', '')).toBeNull();
		expect(discoverRedirect('vim/extra', '')).toBeNull();
	});
});
