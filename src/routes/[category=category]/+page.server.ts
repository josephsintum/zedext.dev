import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requireSnapshot } from '$lib/server/snapshot.js';
import { browseCacheControl, browseData } from '$lib/server/browse.js';
import { categoryPageForSlug } from '$lib/categories.js';
import { searchIndex } from '$lib/search/engine.js';

export const load: PageServerLoad = async ({ params, url, setHeaders }) => {
	const category = categoryPageForSlug(params.category);
	// The param matcher already guarantees this; keeps TypeScript and future edits honest
	if (!category) throw error(404, 'Category not found');

	const loaded = await requireSnapshot();
	setHeaders({ 'cache-control': browseCacheControl(loaded.degraded) });
	return {
		...browseData(loaded, url, category.provides),
		category,
		total: searchIndex(loaded.index, '', { category: category.provides, hitsPerPage: 1 }).nbHits
	};
};
