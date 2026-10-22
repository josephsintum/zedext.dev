import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requireSnapshot } from '$lib/server/snapshot.js';
import { getPreviews } from '$lib/server/previews.js';
import { pageCacheControl } from '$lib/server/browse.js';
import { homeData } from '$lib/server/home.js';
import { legacyHomeRedirect } from '$lib/categories.js';

export const load: PageServerLoad = async ({ url, setHeaders }) => {
	// The homepage used to be the full list: old category, search and sort links move on
	const target = legacyHomeRedirect(url);
	if (target) throw redirect(301, target);

	const [{ snapshot, degraded }, previews] = await Promise.all([requireSnapshot(), getPreviews()]);
	setHeaders({ 'cache-control': pageCacheControl(degraded || !previews) });

	return homeData(snapshot.extensions, previews);
};
