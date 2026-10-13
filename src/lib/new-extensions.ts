import type { ExtensionRecord, Snapshot } from './types.js';

/** The most recently first-released extensions, newest first. */
export function newestExtensions(snapshot: Snapshot, limit = 4): ExtensionRecord[] {
	return snapshot.extensions
		.filter((r) => r.first_published_at)
		.sort(
			(a, b) =>
				b.first_published_at!.localeCompare(a.first_published_at!) ||
				b.download_count - a.download_count
		)
		.slice(0, limit);
}
