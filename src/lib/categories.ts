import { CATEGORIES } from '$lib/utils/constants.js';

/**
 * Clean, indexable URLs for each category, e.g. /mcp-servers for `context-servers`.
 * The `languages` category lives at /languages (also the language hub index).
 */

export interface CategoryPage {
	slug: string;
	provides: string;
	title: string;
	description: string;
}

export const CATEGORY_PAGES: CategoryPage[] = [
	{
		slug: 'themes',
		provides: 'themes',
		title: 'Zed themes',
		description: 'Color themes for the Zed editor, ranked by downloads, with GitHub stats.'
	},
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
	const page = categoryPageForProvides(provides);
	return page ? `/${page.slug}` : '/';
}

/** The browse tab (CATEGORIES slug) a pathname shows, or undefined if it isn't a browse page. */
export function categoryForPath(pathname: string): string | undefined {
	return CATEGORIES.find((cat) => categoryHref(cat.provides ?? 'all') === pathname)?.slug;
}

/** Where an old `/?category=<provides>` link should 301 to, or null to leave it alone. */
export function legacyCategoryRedirect(url: URL): string | null {
	if (url.pathname !== '/') return null;
	const category = url.searchParams.get('category');
	if (!category) return null;
	if (category !== 'all' && category !== 'languages' && !categoryPageForProvides(category)) {
		return null;
	}

	const rest = new URLSearchParams(url.searchParams);
	rest.delete('category');
	rest.delete('page');
	const search = rest.toString();
	return categoryHref(category) + (search ? `?${search}` : '');
}
