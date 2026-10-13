import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSnapshot } from '$lib/server/snapshot.js';

/** The full snapshot, for client-side search. Same origin and CDN-cached. */
export const GET: RequestHandler = async ({ setHeaders }) => {
	const { snapshot, degraded } = await getSnapshot();

	setHeaders({
		'cache-control': degraded
			? 'public, max-age=60, s-maxage=60'
			: 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400'
	});

	return json(snapshot);
};
