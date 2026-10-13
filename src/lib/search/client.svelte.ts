import { browser } from '$app/environment';
import { goto, replaceState } from '$app/navigation';
import { page } from '$app/state';
import { createIndex, type SearchIndex } from './engine.js';
import type { Snapshot } from '$lib/types.js';

/**
 * Browser-side search. Until the index has loaded, search changes navigate
 * normally and the server renders results. Once loaded, they update the URL
 * shallowly and search runs locally.
 */

let index = $state.raw<SearchIndex | null>(null);
let loading: Promise<void> | null = null;

export function getIndex(): SearchIndex | null {
	return index;
}

export function loadIndex(): Promise<void> {
	if (!browser) return Promise.resolve();
	loading ??= fetch('/extensions.json')
		.then((res) => {
			if (!res.ok) throw new Error(`Snapshot fetch failed: ${res.status}`);
			return res.json() as Promise<Snapshot>;
		})
		.then((snapshot) => {
			index = createIndex(snapshot.extensions);
		})
		.catch((err) => {
			console.error('Search index unavailable, using server search:', err);
			loading = null;
		});
	return loading;
}

/** The current search params, including shallow updates (which leave page.url unchanged). */
export function currentSearchParams(): URLSearchParams {
	return new URLSearchParams(page.state.search ?? page.url.search);
}

export function setSearchParams(params: URLSearchParams): void {
	params.delete('page');
	const search = params.toString();
	const url = search ? `?${search}` : page.url.pathname;
	if (index) replaceState(url, { search });
	else goto(url, { replaceState: true, keepFocus: true, noScroll: true });
}
