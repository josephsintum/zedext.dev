import type { PageServerLoad } from './$types';
import { requireSnapshot } from '$lib/server/snapshot.js';
import { searchIndex } from '$lib/search/engine.js';

export const load: PageServerLoad = async ({ url, setHeaders }) => {
	const query = url.searchParams.get('q') ?? '';
	const category = url.searchParams.get('category') ?? 'all';
	const sort = url.searchParams.get('sort') ?? 'downloads';

	const { index, snapshot, degraded } = await requireSnapshot();
	const initialResults = searchIndex(index, query, { category, sort });

	// Set after the data loads so errors aren't cached; the fallback snapshot is cached briefly
	setHeaders({
		'cache-control': degraded
			? 'public, s-maxage=60'
			: 'public, s-maxage=300, stale-while-revalidate=3600'
	});

	// Lets the browser fetch this exact snapshot from a long-cached, versioned URL
	return { initialResults, snapshotVersion: snapshot.generatedAt };
};
