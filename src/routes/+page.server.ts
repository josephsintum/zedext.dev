import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requireSnapshot } from '$lib/server/snapshot.js';
import { browseCacheControl, browseData } from '$lib/server/browse.js';
import { legacyCategoryRedirect } from '$lib/categories.js';
import { newThisWeek } from '$lib/new-extensions.js';

export const load: PageServerLoad = async ({ url, setHeaders }) => {
	// Old /?category=<x> links move to clean category URLs
	const target = legacyCategoryRedirect(url);
	if (target) throw redirect(301, target);

	const loaded = await requireSnapshot();
	setHeaders({ 'cache-control': browseCacheControl(loaded.degraded) });
	return { ...browseData(loaded, url, 'all'), newThisWeek: newThisWeek(loaded.snapshot) };
};
