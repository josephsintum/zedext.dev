import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getPreviews } from '$lib/server/previews.js';
import { pageCacheControl } from '$lib/server/browse.js';
import { themeVariants } from '$lib/theme-picker.js';

/** One theme's variants (both appearances), loaded when someone hovers or picks its card. */
export const GET: RequestHandler = async ({ params }) => {
	const previews = await getPreviews();
	if (!previews) throw error(503, 'Theme previews are unavailable');
	const variants = themeVariants(previews, params.id);
	if (!variants) throw error(404, `No theme "${params.id}"`);
	return json(variants, { headers: { 'cache-control': pageCacheControl(false) } });
};
