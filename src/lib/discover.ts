import { categoryHref } from './categories.js';
import type { PreviewBundle } from './theme-preview.js';
import type { ExtensionRecord } from './types.js';
import { hasKeyword, nameWords } from './words.js';

export type DiscoverSection = 'stacks' | 'themes' | 'ai';

export interface DiscoverList {
	slug: string;
	title: string;
	emoji: string;
	description: string;
	section: DiscoverSection;
	match: {
		/** Any of these */
		provides?: string[];
		/** Exact words in id + name, as on the language hubs */
		keywords?: string[];
		/** Theme lists: a preview variant of this appearance */
		appearance?: 'dark' | 'light';
		/** Keyword rules skip extensions providing any of these (default KEYWORD_EXCLUDES) */
		excludeProvides?: string[];
	};
	/** Shown first, in this order, when present in the snapshot */
	pin?: string[];
	/** Never shown */
	hide?: string[];
	/** Most items on the list page (default 48) */
	limit?: number;
}

/** Keyword rules match names; these kinds have their own lists */
const KEYWORD_EXCLUDES = ['themes', 'icon-themes', 'context-servers', 'agent-servers'];
const DEFAULT_LIMIT = 48;

/** In page order; the language hubs follow them, last */
export const DISCOVER_SECTIONS: { key: DiscoverSection; title: string }[] = [
	{ key: 'ai', title: 'AI' },
	{ key: 'themes', title: 'Themes' },
	{ key: 'stacks', title: 'Stacks' }
];

export const DISCOVER_LISTS: DiscoverList[] = [
	{
		slug: 'everyday-files',
		title: 'Everyday file types',
		emoji: '🗂️',
		description: 'Syntax support for the config and data files every project has.',
		section: 'stacks',
		match: {
			keywords: [
				'toml',
				'dockerfile',
				'docker',
				'compose',
				'make',
				'makefile',
				'sql',
				'env',
				'log',
				'git',
				'yaml',
				'ini',
				'csv',
				'nginx',
				'justfile',
				'terraform'
			]
		},
		hide: ['call-trans-opt-received', 'turbo-log-snippets']
	},
	{
		slug: 'web-dev',
		title: 'Web development',
		emoji: '🌐',
		description:
			'Frameworks, styling and tooling for building for the web. React, TSX and Tailwind are built in.',
		section: 'stacks',
		match: {
			keywords: [
				'html',
				'css',
				'scss',
				'sass',
				'less',
				'emmet',
				'vue',
				'svelte',
				'astro',
				'angular',
				'react',
				'nextjs',
				'tailwind',
				'prisma',
				'graphql',
				'deno',
				'biome',
				'oxc',
				'htmx',
				'unocss',
				'ember',
				'solid',
				'jsx',
				'postcss',
				'stylelint'
			]
		}
	},
	{
		slug: 'dark-themes',
		title: 'Dark themes',
		emoji: '🌙',
		description: 'The most downloaded Zed themes with a dark variant.',
		section: 'themes',
		match: { appearance: 'dark' }
	},
	{
		slug: 'light-themes',
		title: 'Light themes',
		emoji: '☀️',
		description: 'The most downloaded Zed themes with a light variant.',
		section: 'themes',
		match: { appearance: 'light' }
	},
	{
		slug: 'mcp-servers',
		title: 'MCP servers',
		emoji: '🤖',
		description: 'Model Context Protocol servers for Zed’s AI agent, most used first.',
		section: 'ai',
		match: { provides: ['context-servers'] }
	}
];

export function getDiscoverList(slug: string): DiscoverList | undefined {
	return DISCOVER_LISTS.find((c) => c.slug === slug);
}

export function matchesList(
	c: DiscoverList,
	r: ExtensionRecord,
	previews: PreviewBundle | null
): boolean {
	const m = c.match;
	if (m.appearance) {
		if (!previews || !Object.hasOwn(previews.themes, r.id)) return false;
		return previews.themes[r.id].variants.some((v) => v.appearance === m.appearance);
	}
	if (m.provides && !m.provides.some((p) => r.provides.includes(p))) return false;
	if (m.keywords) {
		const excluded = m.excludeProvides ?? KEYWORD_EXCLUDES;
		if (excluded.some((p) => r.provides.includes(p))) return false;
		if (!hasKeyword(nameWords(r), m.keywords)) return false;
	}
	return true;
}

/** Pins first (in order), then matches by downloads; hidden ids never appear. */
export function resolveList(
	c: DiscoverList,
	records: ExtensionRecord[],
	previews: PreviewBundle | null,
	limit = c.limit ?? DEFAULT_LIMIT
): { items: ExtensionRecord[]; total: number } {
	const hidden = new Set(c.hide ?? []);
	const byId = new Map(records.map((r) => [r.id, r]));
	const pinned = (c.pin ?? []).flatMap((id) => {
		const r = byId.get(id);
		return r && !hidden.has(id) ? [r] : [];
	});
	const pinnedIds = new Set(pinned.map((r) => r.id));
	const matched = records
		.filter((r) => !hidden.has(r.id) && !pinnedIds.has(r.id) && matchesList(c, r, previews))
		.sort((a, b) => b.download_count - a.download_count);
	const all = [...pinned, ...matched];
	return { items: all.slice(0, limit), total: all.length };
}

/** The full category page behind a list, linked when the list page is capped */
export function browseAllHref(c: DiscoverList): string | null {
	if (c.match.appearance) return '/themes';
	if (c.match.provides?.length === 1 && !c.match.keywords) return categoryHref(c.match.provides[0]);
	return null;
}
