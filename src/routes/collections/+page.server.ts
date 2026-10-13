import type { PageServerLoad } from './$types';
import { COLLECTIONS } from '$lib/collections.js';

export const load: PageServerLoad = async ({ setHeaders }) => {
	setHeaders({ 'cache-control': 'public, s-maxage=3600, stale-while-revalidate=86400' });
	return { collections: COLLECTIONS };
};
