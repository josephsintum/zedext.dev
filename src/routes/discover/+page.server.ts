import type { PageServerLoad } from './$types';
import { requireSnapshot } from '$lib/server/snapshot.js';
import { getPreviews } from '$lib/server/previews.js';
import { pageCacheControl } from '$lib/server/browse.js';
import { DISCOVER_SECTIONS, DISCOVER_LISTS, resolveList } from '$lib/discover.js';
import { newestExtensions, recentlyUpdated } from '$lib/new-extensions.js';
import { hubSummaries } from '$lib/language-hub.js';
import { themeEntries } from '$lib/theme-picker.js';

const CARDS_PER_ROW = 4;
const THEMES_ROW = 8;

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
			.map((list) => ({ list, ...resolveList(list, records, CARDS_PER_ROW) }))
			.filter((row) => row.items.length > 0)
	})).filter((s) => s.rows.length > 0);
	// Most themes are dark-first; the picker has the light toggle
	const themes = themeEntries(previews, records, 'dark', THEMES_ROW);

	return { newest, updated, hubs: hubSummaries(records), sections, themes };
};
