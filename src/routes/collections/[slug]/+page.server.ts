import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requireSnapshot } from '$lib/server/snapshot.js';
import { getPreviews } from '$lib/server/previews.js';
import { pageCacheControl } from '$lib/server/browse.js';
import { COLLECTION_REDIRECTS, getCollection, resolveCollection } from '$lib/collections.js';
import { themeTile } from '$lib/theme-tile.js';

export const load: PageServerLoad = async ({ params, setHeaders }) => {
	if (Object.hasOwn(COLLECTION_REDIRECTS, params.slug)) {
		throw redirect(301, COLLECTION_REDIRECTS[params.slug]);
	}
	const collection = getCollection(params.slug);
	if (!collection) throw error(404, `No collection "${params.slug}"`);

	const appearance = collection.match.appearance;
	const [{ snapshot, degraded }, previews] = await Promise.all([
		requireSnapshot(),
		appearance ? getPreviews() : Promise.resolve(null)
	]);
	setHeaders({ 'cache-control': pageCacheControl(degraded || (!!appearance && !previews)) });

	const { items, total } = resolveCollection(collection, snapshot.extensions, previews);
	const tiles = appearance ? items.flatMap((r) => themeTile(previews, r, appearance) ?? []) : null;
	return { collection, items, total, tiles };
};
