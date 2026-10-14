import type { PageServerLoad } from './$types';
import { requireSnapshot } from '$lib/server/snapshot.js';
import { getPreviews } from '$lib/server/previews.js';
import { pageCacheControl } from '$lib/server/browse.js';
import { pickerState, themeEntries, type Appearance, type ThemeEntry } from '$lib/theme-picker.js';

/** Sent with the page; the rest load on "Show all" from /discover/themes.json */
const INITIAL = 48;

export const load: PageServerLoad = async ({ url, setHeaders }) => {
	const [{ snapshot, degraded }, previews] = await Promise.all([requireSnapshot(), getPreviews()]);
	setHeaders({ 'cache-control': pageCacheControl(degraded || !previews) });

	const all: Record<Appearance, ThemeEntry[]> = {
		dark: themeEntries(previews, snapshot.extensions, 'dark'),
		light: themeEntries(previews, snapshot.extensions, 'light')
	};
	const { appearance, themeId } = pickerState(url, all);

	// A linked theme outside the top 48 still has to be selectable, so it rides along
	const initial = (a: Appearance) => {
		const top = all[a].slice(0, INITIAL);
		const linked = a === appearance ? all[a].find((e) => e.id === themeId) : undefined;
		return linked && !top.includes(linked) ? [...top, linked] : top;
	};

	return {
		appearance,
		themeId,
		entries: { dark: initial('dark'), light: initial('light') },
		totals: { dark: all.dark.length, light: all.light.length }
	};
};
