import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requireSnapshot } from '$lib/server/snapshot.js';
import { pageCacheControl } from '$lib/server/browse.js';
import { LANGUAGE_HUBS, getLanguageHub, zedDocsUrl } from '$lib/languages.js';
import { buildHub } from '$lib/language-hub.js';

export const load: PageServerLoad = async ({ params, setHeaders }) => {
	const hub = getLanguageHub(params.slug);
	if (!hub) throw error(404, `No language hub for "${params.slug}"`);

	const { snapshot, degraded } = await requireSnapshot();
	setHeaders({ 'cache-control': pageCacheControl(degraded) });
	return {
		hub,
		docsUrl: zedDocsUrl(hub),
		...buildHub(hub, snapshot.extensions),
		others: LANGUAGE_HUBS.filter((h) => h.slug !== hub.slug).map(({ slug, name, emoji }) => ({
			slug,
			name,
			emoji
		}))
	};
};
