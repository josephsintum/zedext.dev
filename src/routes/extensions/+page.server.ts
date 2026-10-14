import type { PageServerLoad } from './$types';
import { requireSnapshot } from '$lib/server/snapshot.js';
import { browseCacheControl, browseData } from '$lib/server/browse.js';

export const load: PageServerLoad = async ({ url, setHeaders }) => {
	const loaded = await requireSnapshot();
	setHeaders({ 'cache-control': browseCacheControl(loaded.degraded) });
	return browseData(loaded, url, 'all');
};
