import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requireSnapshot } from '$lib/server/snapshot.js';
import { pageCacheControl } from '$lib/server/browse.js';
import { browseAll, getDiscoverList, resolveList } from '$lib/discover.js';
import { buildGuide, GUIDES } from '$lib/discover-guides.js';

export const load: PageServerLoad = async ({ params, setHeaders }) => {
	const list = getDiscoverList(params.slug);
	if (!list) throw error(404, `No Discover list "${params.slug}"`);

	const { snapshot, degraded } = await requireSnapshot();
	setHeaders({ 'cache-control': pageCacheControl(degraded) });

	// A written guide shows every match (grouped picks, then the rest), so it isn't capped
	const written = Object.hasOwn(GUIDES, list.slug) ? GUIDES[list.slug] : null;
	const { items, total } = resolveList(list, snapshot.extensions, written ? Infinity : undefined);
	const guide = written ? buildGuide(written, items) : null;
	return { list, items, total, guide, browseAll: browseAll(list) };
};
