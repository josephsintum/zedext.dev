import { KINDS } from '$lib/kinds.js';

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

export const CATEGORY_PAGES: CategoryPage[] = Object.values(KINDS).flatMap((k) =>
	'page' in k ? [{ provides: k.provide, ...k.page }] : []
);

/** The category tabs: All, then every kind */
export const CATEGORY_TABS: { provides: string; label: string }[] = [
	{ provides: 'all', label: 'All' },
	...Object.values(KINDS).map((k) => ({ provides: k.provide, label: k.plural }))
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

/** The browse tab (provides, or 'all') a pathname shows, or undefined if it isn't a browse page. */
export function categoryForPath(pathname: string): string | undefined {
	return CATEGORY_TABS.find((tab) => categoryHref(tab.provides) === pathname)?.provides;
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
	if (category && !CATEGORY_TABS.some((tab) => tab.provides === category)) return null;
	if (!category && !LIST_PARAMS.some((p) => url.searchParams.has(p))) return null;

	const rest = new URLSearchParams(url.searchParams);
	rest.delete('category');
	if (category) rest.delete('page');
	const search = rest.toString();
	return categoryHref(category ?? 'all') + (search ? `?${search}` : '');
}
