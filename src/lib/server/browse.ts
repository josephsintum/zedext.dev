import { searchIndex } from '$lib/search/engine.js';
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
	return {
		initialResults: searchIndex(loaded.index, query, { category, sort }),
		// Lets the browser fetch this exact snapshot from a long-cached, versioned URL
		snapshotVersion: loaded.snapshot.generatedAt
	};
}

/** Set after the data loads so errors aren't cached; the fallback snapshot is cached briefly. */
export function browseCacheControl(degraded: boolean): string {
	return degraded ? 'public, s-maxage=60' : 'public, s-maxage=300, stale-while-revalidate=3600';
}

/** Hub and collection pages change at most daily. */
export function pageCacheControl(degraded: boolean): string {
	return degraded ? 'public, s-maxage=60' : 'public, s-maxage=3600, stale-while-revalidate=86400';
}
