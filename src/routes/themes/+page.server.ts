import type { PageServerLoad } from './$types';
import { requireSnapshot } from '$lib/server/snapshot.js';
import { getPreviews } from '$lib/server/previews.js';
import { pageCacheControl } from '$lib/server/browse.js';
import {
	filterThemes,
	pickerState,
	themeEntries,
	themeVariants,
	type Appearance,
	type ThemeEntry
} from '$lib/theme-picker.js';

/** Sent with the page; the rest load on "Show all" (or the first filter) from /themes.json */
const INITIAL = 48;

export const load: PageServerLoad = async ({ url, setHeaders }) => {
	const [{ snapshot, degraded }, previews] = await Promise.all([requireSnapshot(), getPreviews()]);
	setHeaders({ 'cache-control': pageCacheControl(degraded || !previews) });

	const all: Record<Appearance, ThemeEntry[]> = {
		dark: themeEntries(previews, snapshot.extensions, 'dark'),
		light: themeEntries(previews, snapshot.extensions, 'light')
	};
	const state = pickerState(url, all);
	const { appearance } = state;
	const linked = state.themeId === url.searchParams.get('theme');

	// A filtered link (/themes?q=nord) sends every match, so it works before any script runs
	const q = url.searchParams.get('q') ?? '';
	const shown = (a: Appearance) => (q ? filterThemes(all[a], q) : all[a].slice(0, INITIAL));
	// Without a linked theme, a filtered page previews its best match
	const themeId = linked || !q ? state.themeId : (shown(appearance)[0]?.id ?? null);

	// A linked theme outside the list still has to be selectable, so it rides along
	const initial = (a: Appearance) => {
		const top = shown(a);
		const extra = linked && a === appearance ? all[a].find((e) => e.id === themeId) : undefined;
		return extra && !top.includes(extra) ? [...top, extra] : top;
	};

	return {
		appearance,
		themeId,
		q,
		entries: { dark: initial('dark'), light: initial('light') },
		/** The rest load from /themes/<id>.json on hover or click */
		selectedVariants: (themeId && themeVariants(previews, themeId)) || [],
		totals: { dark: all.dark.length, light: all.light.length }
	};
};
