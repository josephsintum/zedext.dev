import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requireSnapshot } from '$lib/server/snapshot.js';
import { getPreviews } from '$lib/server/previews.js';
import { pageCacheControl } from '$lib/server/browse.js';
import { browseAll, getDiscoverList, resolveList } from '$lib/discover.js';
import { themeTile } from '$lib/theme-tile.js';
import { buildGuide, GUIDES } from '$lib/discover-guides.js';

export const load: PageServerLoad = async ({ params, setHeaders }) => {
	const list = getDiscoverList(params.slug);
	if (!list) throw error(404, `No Discover list "${params.slug}"`);

	const appearance = list.match.appearance;
	const [{ snapshot, degraded }, previews] = await Promise.all([
		requireSnapshot(),
		appearance ? getPreviews() : Promise.resolve(null)
	]);
	setHeaders({ 'cache-control': pageCacheControl(degraded || (!!appearance && !previews)) });

	// A written guide shows every match (grouped picks, then the rest), so it isn't capped
	const written = Object.hasOwn(GUIDES, list.slug) ? GUIDES[list.slug] : null;
	const { items, total } = resolveList(
		list,
		snapshot.extensions,
		previews,
		written ? Infinity : undefined
	);
	const tiles = appearance ? items.flatMap((r) => themeTile(previews, r, appearance) ?? []) : null;
	const guide = written ? buildGuide(written, items) : null;
	return { list, items, total, tiles, guide, browseAll: browseAll(list) };
};
