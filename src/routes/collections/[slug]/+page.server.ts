import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requireSnapshot } from '$lib/server/snapshot.js';
import { pageCacheControl } from '$lib/server/browse.js';
import { getCollection, resolveCollection } from '$lib/collections.js';

export const load: PageServerLoad = async ({ params, setHeaders }) => {
	const collection = getCollection(params.slug);
	if (!collection) throw error(404, `No collection "${params.slug}"`);

	const { index, degraded } = await requireSnapshot();
	setHeaders({ 'cache-control': pageCacheControl(degraded) });
	return { collection, items: resolveCollection(collection, index.byId) };
};
