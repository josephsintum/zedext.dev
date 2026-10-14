import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requireSnapshot } from '$lib/server/snapshot.js';
import { pageCacheControl } from '$lib/server/browse.js';
import { browseAll, getGuideList, resolveList } from '$lib/guides.js';
import { buildGuide, GUIDES } from '$lib/guide-content.js';

export const load: PageServerLoad = async ({ params, setHeaders }) => {
	const list = getGuideList(params.slug);
	if (!list) throw error(404, `No guide "${params.slug}"`);

	const { snapshot, degraded } = await requireSnapshot();
	setHeaders({ 'cache-control': pageCacheControl(degraded) });

	// A written guide shows every match (grouped picks, then the rest), so it isn't capped
	const written = Object.hasOwn(GUIDES, list.slug) ? GUIDES[list.slug] : null;
	const { items, total } = resolveList(list, snapshot.extensions, written ? Infinity : undefined);
	const guide = written ? buildGuide(written, items) : null;
	return { list, items, total, guide, browseAll: browseAll(list) };
};
