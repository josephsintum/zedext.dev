import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requireSnapshot } from '$lib/server/snapshot.js';
import { pageCacheControl } from '$lib/server/browse.js';
import { ALTERNATIVES_MIN_DOWNLOADS, findSimilar } from '$lib/search/similar.js';

export const load: PageServerLoad = async ({ params, setHeaders }) => {
	const { index, degraded } = await requireSnapshot();
	const extension = index.byId.get(params.id);
	if (!extension) throw error(404, `Extension "${params.id}" not found`);

	setHeaders({ 'cache-control': pageCacheControl(degraded) });
	return {
		extension,
		alternatives: findSimilar(index, extension.id, 12),
		// Thin pages for tiny extensions shouldn't be indexed
		indexable: extension.download_count >= ALTERNATIVES_MIN_DOWNLOADS
	};
};
