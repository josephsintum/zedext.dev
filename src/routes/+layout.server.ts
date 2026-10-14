import type { LayoutServerLoad } from './$types';
import { getSnapshot } from '$lib/server/snapshot.js';

/** When the data was last synced, for the footer. Never fails a page: null hides the line. */
export const load: LayoutServerLoad = async () => {
	const loaded = await getSnapshot().catch(() => null);
	// The fallback snapshot is built live from Zed's API and has no GitHub data to date
	return { dataUpdatedAt: loaded && !loaded.degraded ? loaded.snapshot.generatedAt : null };
};
