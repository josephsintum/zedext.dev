import type { ExtensionRecord, Snapshot } from './types.js';

/** Themes dominate new releases and have their own Discover rows */
const isTheme = (r: ExtensionRecord) =>
	r.provides.includes('themes') || r.provides.includes('icon-themes');

/** The most recently first-released extensions (themes excluded), newest first. */
export function newestExtensions(snapshot: Snapshot, limit = 4): ExtensionRecord[] {
	return snapshot.extensions
		.filter((r) => r.first_published_at && !isTheme(r))
		.sort(
			(a, b) =>
				b.first_published_at!.localeCompare(a.first_published_at!) ||
				b.download_count - a.download_count
		)
		.slice(0, limit);
}

const UPDATED_MIN_DOWNLOADS = 50_000;

/** Fresh releases of popular extensions, newest first, skipping ids already shown. */
export function recentlyUpdated(
	records: ExtensionRecord[],
	exclude: Set<string>,
	limit = 4
): ExtensionRecord[] {
	return records
		.filter((r) => r.download_count >= UPDATED_MIN_DOWNLOADS && !exclude.has(r.id))
		.sort((a, b) => b.published_at.localeCompare(a.published_at))
		.slice(0, limit);
}
