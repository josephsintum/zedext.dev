import type { ExtensionRecord, Snapshot } from './types.js';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Extensions whose first version came out in the week before the snapshot's sync,
 * newest first. Measured from the sync rather than the clock so cached pages agree.
 */
export function newThisWeek(snapshot: Snapshot, limit = 4): ExtensionRecord[] {
	const since = Date.parse(snapshot.generatedAt) - WEEK_MS;
	return snapshot.extensions
		.filter((r) => r.first_published_at && Date.parse(r.first_published_at) >= since)
		.sort(
			(a, b) =>
				b.first_published_at!.localeCompare(a.first_published_at!) ||
				b.download_count - a.download_count
		)
		.slice(0, limit);
}
