import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireSnapshot } from '$lib/server/snapshot.js';
import { getPreviews } from '$lib/server/previews.js';
import { pageCacheControl } from '$lib/server/browse.js';
import { themeEntries } from '$lib/theme-picker.js';

/** Every theme of one appearance, for the picker's "Show all" button (~86 KB gzip for dark). */
export const GET: RequestHandler = async ({ url }) => {
	const appearance = url.searchParams.get('appearance') === 'light' ? 'light' : 'dark';
	const [{ snapshot, degraded }, previews] = await Promise.all([requireSnapshot(), getPreviews()]);
	return json(themeEntries(previews, snapshot.extensions, appearance), {
		headers: { 'cache-control': pageCacheControl(degraded || !previews) }
	});
};
