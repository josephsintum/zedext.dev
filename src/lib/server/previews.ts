import { env } from '$env/dynamic/private';
import { getCached } from './cache.js';
import { PREVIEWS_PATH } from './previews-sync.js';
import type { PreviewBundle } from '$lib/theme-preview.js';

const ONE_HOUR = 60 * 60 * 1000;
/** The bundle is ~1.3 MB; past this, pages render without previews */
const TIMEOUT_MS = 10_000;

/** The theme previews bundle written by the sync, or null if unavailable (never throws). */
export async function getPreviews(): Promise<PreviewBundle | null> {
	if (!env.SNAPSHOT_URL) return null;
	try {
		return await getCached('theme-previews', ONE_HOUR, async () => {
			const res = await fetch(new URL(PREVIEWS_PATH, env.SNAPSHOT_URL), {
				signal: AbortSignal.timeout(TIMEOUT_MS)
			});
			if (!res.ok) throw new Error(`Theme previews fetch failed: ${res.status}`);
			return (await res.json()) as PreviewBundle;
		});
	} catch (err) {
		console.error('Theme previews unavailable:', err);
		return null;
	}
}
