import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireSnapshot } from '$lib/server/snapshot.js';

/** The full snapshot, for client-side search. Same origin and CDN-cached. */
export const GET: RequestHandler = async ({ url, setHeaders }) => {
	const { snapshot, degraded } = await requireSnapshot();

	// ?v=<generatedAt> names one snapshot forever, so it can be cached for a year.
	// Any other request (no version, or a version this instance doesn't hold) is cached briefly,
	// so a stale instance can't pin old data under a newer version's URL.
	const exact = !degraded && url.searchParams.get('v') === snapshot.generatedAt;
	setHeaders({
		'cache-control': exact
			? 'public, max-age=31536000, immutable'
			: degraded
				? 'public, max-age=60, s-maxage=60'
				: 'public, max-age=300, s-maxage=300'
	});

	return json(snapshot);
};
