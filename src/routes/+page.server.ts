import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requireSnapshot } from '$lib/server/snapshot.js';
import { getPreviews } from '$lib/server/previews.js';
import { pageCacheControl } from '$lib/server/browse.js';
import { legacyHomeRedirect } from '$lib/categories.js';
import { GUIDE_LISTS, resolveList } from '$lib/guides.js';
import { newestExtensions, recentlyUpdated } from '$lib/new-extensions.js';
import { hubSummaries } from '$lib/language-hub.js';
import { themeEntries } from '$lib/theme-picker.js';

const CARDS_PER_ROW = 4;
const THEMES_ROW = 8;

export const load: PageServerLoad = async ({ url, setHeaders }) => {
	// The homepage used to be the full list: old category, search and sort links move on
	const target = legacyHomeRedirect(url);
	if (target) throw redirect(301, target);

	const [{ snapshot, degraded }, previews] = await Promise.all([requireSnapshot(), getPreviews()]);
	setHeaders({ 'cache-control': pageCacheControl(degraded || !previews) });

	const records = snapshot.extensions;
	const newest = newestExtensions(snapshot);
	const updated = recentlyUpdated(records, new Set(newest.map((r) => r.id)));

	const guides = GUIDE_LISTS.map((list) => ({
		list,
		...resolveList(list, records, CARDS_PER_ROW)
	})).filter((g) => g.items.length > 0);
	// Most themes are dark-first; the picker has the light toggle
	const themes = themeEntries(previews, records, 'dark', THEMES_ROW);

	return {
		newest,
		updated,
		hubs: hubSummaries(records),
		guides,
		themes,
		extensionCount: records.length,
		// Lets the search box fetch this exact snapshot from a long-cached, versioned URL
		snapshotVersion: snapshot.generatedAt
	};
};
