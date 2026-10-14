import { searchIndex } from '$lib/search/engine.js';
import { clampPage, MAX_SERVER_PAGES, PER_PAGE } from '$lib/search/paging.js';
import type { LoadedSnapshot } from './snapshot.js';
import type { SearchResults } from '$lib/types.js';

/** First page of results for a browse page (homepage, category pages, /languages). */
export function browseData(
	loaded: LoadedSnapshot,
	url: URL,
	category: string
): { initialResults: SearchResults; snapshotVersion: string } {
	const query = url.searchParams.get('q') ?? '';
	const sort = url.searchParams.get('sort') ?? 'downloads';
	const hitsPerPage = PER_PAGE * clampPage(url.searchParams.get('page'), MAX_SERVER_PAGES);
	return {
		initialResults: searchIndex(loaded.index, query, { category, sort, hitsPerPage }),
		// Lets the browser fetch this exact snapshot from a long-cached, versioned URL
		snapshotVersion: loaded.snapshot.generatedAt
	};
}

/** Set after the data loads so errors aren't cached; the fallback snapshot is cached briefly. */
export function browseCacheControl(degraded: boolean): string {
	return degraded ? 'public, s-maxage=60' : 'public, s-maxage=300, stale-while-revalidate=3600';
}

/** The homepage, language hubs and guides change at most daily. */
export function pageCacheControl(degraded: boolean): string {
	return degraded ? 'public, s-maxage=60' : 'public, s-maxage=3600, stale-while-revalidate=86400';
}
