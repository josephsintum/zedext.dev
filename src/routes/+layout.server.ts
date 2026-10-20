import type { LayoutServerLoad } from './$types';
import { getSnapshot } from '$lib/server/snapshot.js';

/**
 * The snapshot's version, which is also when the data was last synced: the footer shows it, and
 * the search index is fetched from a long-cached URL named by it. Never fails a page: null hides
 * the footer line and fetches the index unversioned.
 */
export const load: LayoutServerLoad = async () => {
	const loaded = await getSnapshot().catch(() => null);
	// The fallback snapshot is built live from Zed's API and has no GitHub data to date
	return { snapshotVersion: loaded && !loaded.degraded ? loaded.snapshot.generatedAt : null };
};
