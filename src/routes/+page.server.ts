import type { PageServerLoad } from './$types';
import { getSnapshot } from '$lib/server/snapshot.js';
import { searchIndex } from '$lib/search/engine.js';

export const load: PageServerLoad = async ({ url, setHeaders }) => {
	setHeaders({
		'cache-control': 'public, s-maxage=300, stale-while-revalidate=3600'
	});

	const query = url.searchParams.get('q') ?? '';
	const category = url.searchParams.get('category') ?? 'all';
	const sort = url.searchParams.get('sort') ?? 'downloads';

	const { index, snapshot } = await getSnapshot();
	const initialResults = searchIndex(index, query, { category, sort });

	// Lets the browser fetch this exact snapshot from a long-cached, versioned URL
	return { initialResults, snapshotVersion: snapshot.generatedAt };
};
