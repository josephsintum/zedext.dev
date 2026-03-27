import type { PageServerLoad } from './$types';
import { searchExtensionsServer } from '$lib/server/algolia-search.js';

export const load: PageServerLoad = async ({ url, setHeaders }) => {
	setHeaders({
		'cache-control': 'public, s-maxage=300, stale-while-revalidate=3600'
	});

	const query = url.searchParams.get('q') ?? '';
	const category = url.searchParams.get('category') ?? 'all';
	const sort = url.searchParams.get('sort') ?? 'downloads';

	const initialResults = await searchExtensionsServer(query, { category, sort });

	return { initialResults, ssrQuery: query, ssrCategory: category, ssrSort: sort };
};
