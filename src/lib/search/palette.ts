/**
 * Helpers for the search window (SearchDialog): pure, so they're tested without a browser.
 */

/** How many matches the window lists before its "See all" row */
export const QUICK_LIMIT = 8;

/** `name` split around the first case-insensitive occurrence of the (trimmed) query, or null */
export function highlight(name: string, query: string): [string, string, string] | null {
	const at = query ? name.toLowerCase().indexOf(query.toLowerCase()) : -1;
	if (at < 0) return null;
	return [name.slice(0, at), name.slice(at, at + query.length), name.slice(at + query.length)];
}

/** The full results page for a (trimmed) query */
export function searchHref(query: string): string {
	return `/extensions?q=${encodeURIComponent(query)}`;
}

/** Macs, iPhones and iPads show ⌘K; everything else Ctrl K */
export function isApplePlatform(platform: string): boolean {
	return /mac|iphone|ipad|ipod/i.test(platform);
}

/** Keys typed into a field are text, not shortcuts */
export function isTypingTarget(target: EventTarget | null): boolean {
	const el = target as HTMLElement | null;
	return !!el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));
}
