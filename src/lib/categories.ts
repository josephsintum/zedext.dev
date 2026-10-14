import { CATEGORIES } from '$lib/utils/constants.js';

/**
 * Clean, indexable URLs for each category, e.g. /mcp-servers for `context-servers`.
 * The `languages` category lives at /languages (also the language hub index), `themes` at
 * /themes (the theme picker), and the full list at /extensions.
 */

export interface CategoryPage {
	slug: string;
	provides: string;
	title: string;
	description: string;
}

export const CATEGORY_PAGES: CategoryPage[] = [
	{
		slug: 'icon-themes',
		provides: 'icon-themes',
		title: 'Zed icon themes',
		description: 'File icon themes for the Zed editor, ranked by downloads.'
	},
	{
		slug: 'language-servers',
		provides: 'language-servers',
		title: 'Zed language servers',
		description:
			'Language server extensions for the Zed editor: completion, diagnostics and go to definition for more languages and tools.'
	},
	{
		slug: 'mcp-servers',
		provides: 'context-servers',
		title: 'MCP servers for Zed',
		description:
			'Model Context Protocol servers that give Zed’s AI agent access to more tools and data.'
	},
	{
		slug: 'agent-servers',
		provides: 'agent-servers',
		title: 'Zed agent servers',
		description: 'External AI agents you can run inside the Zed editor.'
	},
	{
		slug: 'debug-adapters',
		provides: 'debug-adapters',
		title: 'Zed debug adapters',
		description: 'Debugger extensions for the Zed editor.'
	},
	{
		slug: 'snippets',
		provides: 'snippets',
		title: 'Zed snippets',
		description: 'Snippet packs for the Zed editor, ranked by downloads.'
	}
];

export function categoryPageForSlug(slug: string): CategoryPage | undefined {
	return CATEGORY_PAGES.find((c) => c.slug === slug);
}

export function categoryPageForProvides(provides: string): CategoryPage | undefined {
	return CATEGORY_PAGES.find((c) => c.provides === provides);
}

export function categoryHref(provides: string): string {
	if (provides === 'languages') return '/languages';
	if (provides === 'themes') return '/themes';
	const page = categoryPageForProvides(provides);
	return page ? `/${page.slug}` : '/extensions';
}

/** The browse tab (CATEGORIES slug) a pathname shows, or undefined if it isn't a browse page. */
export function categoryForPath(pathname: string): string | undefined {
	return CATEGORIES.find((cat) => categoryHref(cat.provides ?? 'all') === pathname)?.slug;
}

/** Search params that mean "show me the list", from when the homepage was the list */
const LIST_PARAMS = ['q', 'sort', 'page'];

/**
 * Where an old homepage link should 301 to, or null to leave it alone: `/?category=<provides>`
 * goes to that category's page, and a search, sort or page goes to /extensions.
 */
export function legacyHomeRedirect(url: URL): string | null {
	if (url.pathname !== '/') return null;
	const category = url.searchParams.get('category');
	if (category && !CATEGORIES.some((c) => (c.provides ?? 'all') === category)) return null;
	if (!category && !LIST_PARAMS.some((p) => url.searchParams.has(p))) return null;

	const rest = new URLSearchParams(url.searchParams);
	rest.delete('category');
	if (category) rest.delete('page');
	const search = rest.toString();
	return categoryHref(category ?? 'all') + (search ? `?${search}` : '');
}
