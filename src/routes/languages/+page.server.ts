import type { PageServerLoad } from './$types';
import { requireSnapshot } from '$lib/server/snapshot.js';
import { browseCacheControl, browseData } from '$lib/server/browse.js';
import { LANGUAGE_HUBS } from '$lib/languages.js';
import { matchesHub } from '$lib/language-hub.js';

export const load: PageServerLoad = async ({ url, setHeaders }) => {
	const loaded = await requireSnapshot();
	setHeaders({ 'cache-control': browseCacheControl(loaded.degraded) });
	return {
		...browseData(loaded, url, 'languages'),
		hubs: LANGUAGE_HUBS.map((hub) => ({
			slug: hub.slug,
			name: hub.name,
			emoji: hub.emoji,
			builtIn: hub.builtIn.length > 0,
			count: loaded.snapshot.extensions.filter((r) => matchesHub(hub, r)).length
		}))
	};
};
