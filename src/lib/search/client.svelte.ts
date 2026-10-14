import { browser } from '$app/environment';
import { goto, replaceState } from '$app/navigation';
import { page } from '$app/state';
import { createIndex, type SearchIndex } from './engine.js';
import type { Snapshot } from '$lib/types.js';

/**
 * Browser-side search. The index loads on the first sign of search intent
 * (focus, typing, tab, sort, show more), not on page load. Until it has loaded,
 * search changes navigate normally and the server renders results. Once loaded,
 * they update the URL shallowly and search runs locally.
 */

let index = $state.raw<SearchIndex | null>(null);
let status = $state<'idle' | 'loading' | 'ready' | 'failed'>('idle');
let loading: Promise<void> | null = null;
/** The newest search requested, so a slower server navigation can't overwrite it. */
let latest: string | null = null;

export function getIndex(): SearchIndex | null {
	return index;
}

export function getIndexStatus(): typeof status {
	return status;
}

export function loadIndex(): Promise<void> {
	if (!browser) return Promise.resolve();
	const version = page.data.snapshotVersion as string | undefined;
	const url = version ? `/extensions.json?v=${encodeURIComponent(version)}` : '/extensions.json';
	if (loading) return loading;
	status = 'loading';
	loading = fetch(url)
		.then((res) => {
			if (!res.ok) throw new Error(`Snapshot fetch failed: ${res.status}`);
			return res.json() as Promise<Snapshot>;
		})
		.then((snapshot) => {
			index = createIndex(snapshot.extensions);
			status = 'ready';
		})
		.catch((err) => {
			console.error('Search index unavailable, using server search:', err);
			status = 'failed';
			loading = null; // a later intent retries
		});
	return loading;
}

/** The current search params, including shallow updates (which leave page.url unchanged). */
export function currentSearchParams(): URLSearchParams {
	return new URLSearchParams(page.state.search ?? page.url.search);
}

/**
 * Apply new search params on the current browse page. `scroll` returns to the top, for
 * changes that replace the whole list (sort) rather than refine it as you type. `path` is
 * the page the change was made on; if the user has since left it, nothing happens.
 */
export function setSearchParams(
	params: URLSearchParams,
	{ scroll = false, path = page.url.pathname }: { scroll?: boolean; path?: string } = {}
): void {
	// e.g. a debounced search firing after the user already left the page
	if (page.url.pathname !== path) return;
	params.delete('page');
	const search = params.toString();
	latest = search;

	if (index) {
		applyShallow(search);
		if (scroll) window.scrollTo({ top: 0 });
		return;
	}

	goto(hrefFor(search), { replaceState: true, keepFocus: true, noScroll: !scroll })
		.catch(() => {})
		.then(() => {
			// If the index arrived while this navigation was in flight, newer searches were
			// applied shallowly and this navigation just overwrote them: reapply the newest
			if (index && latest !== null && page.url.pathname === path && latest !== currentSearch()) {
				applyShallow(latest);
			}
		});
	loadIndex();
}

/**
 * Record how many pages are shown, without a navigation: the list grows from the index,
 * and the URL just remembers it for Back and reloads (where the server renders them all).
 */
export function setPageParam(params: URLSearchParams): void {
	applyShallow(params.toString());
}

function currentSearch(): string {
	return currentSearchParams().toString();
}

function hrefFor(search: string): string {
	return search ? `?${search}` : page.url.pathname;
}

function applyShallow(search: string): void {
	replaceState(hrefFor(search), { search });
}
