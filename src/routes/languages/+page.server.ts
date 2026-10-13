import type { PageServerLoad } from './$types';
import { requireSnapshot } from '$lib/server/snapshot.js';
import { browseCacheControl, browseData } from '$lib/server/browse.js';
import { hubSummaries } from '$lib/language-hub.js';

export const load: PageServerLoad = async ({ url, setHeaders }) => {
	const loaded = await requireSnapshot();
	setHeaders({ 'cache-control': browseCacheControl(loaded.degraded) });
	return {
		...browseData(loaded, url, 'languages'),
		hubs: hubSummaries(loaded.snapshot.extensions)
	};
};
