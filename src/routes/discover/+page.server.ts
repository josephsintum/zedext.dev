import type { PageServerLoad } from './$types';
import { requireSnapshot } from '$lib/server/snapshot.js';
import { getPreviews } from '$lib/server/previews.js';
import { pageCacheControl } from '$lib/server/browse.js';
import { DISCOVER_SECTIONS, DISCOVER_LISTS, resolveList } from '$lib/discover.js';
import { newestExtensions, recentlyUpdated } from '$lib/new-extensions.js';
import { hubSummaries } from '$lib/language-hub.js';
import { themeTile } from '$lib/theme-tile.js';

const CARDS_PER_ROW = 4;
const TILES_PER_ROW = 6;

export const load: PageServerLoad = async ({ setHeaders }) => {
	const [{ snapshot, degraded }, previews] = await Promise.all([requireSnapshot(), getPreviews()]);
	setHeaders({ 'cache-control': pageCacheControl(degraded || !previews) });

	const records = snapshot.extensions;
	const newest = newestExtensions(snapshot);
	const updated = recentlyUpdated(records, new Set(newest.map((r) => r.id)));

	const sections = DISCOVER_SECTIONS.map(({ key, title }) => ({
		key,
		title,
		rows: DISCOVER_LISTS.filter((c) => c.section === key)
			.map((list) => {
				const appearance = list.match.appearance;
				const { items, total } = resolveList(
					list,
					records,
					previews,
					appearance ? TILES_PER_ROW : CARDS_PER_ROW
				);
				const tiles = appearance
					? items.flatMap((r) => themeTile(previews, r, appearance) ?? [])
					: null;
				return { list, items, tiles, total };
			})
			.filter((row) => (row.tiles ? row.tiles.length > 0 : row.items.length > 0))
	})).filter((s) => s.rows.length > 0);

	return { newest, updated, hubs: hubSummaries(records), sections };
};
