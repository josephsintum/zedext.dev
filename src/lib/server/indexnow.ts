/**
 * IndexNow: tells Bing (which shares with DuckDuckGo, Yandex, Seznam, Naver and Yep) which
 * pages changed in a sync, so they're re-crawled within hours. Google doesn't take part; the
 * sitemap covers it. https://www.indexnow.org/documentation
 */
import type { NetDeps } from './net.js';
import type { ExtensionRecord, Snapshot } from '../types.js';

/** Not a secret: static/<key>.txt serves it, which is how engines check we own the host */
export const INDEXNOW_KEY = 'dae3638a4930e8b5873415201b48aaba';

const SITE = 'https://zedext.dev';
const ENDPOINT = 'https://api.indexnow.org/indexnow';
const TIMEOUT_MS = 10_000;
/** The most one request may carry */
const MAX_URLS = 10_000;

/**
 * Extension pages whose content changed since the previous snapshot: new, updated (new
 * version) and removed ones. Star and download counts change nightly for nearly everything,
 * so they don't count (nor does the homepage, whose rows don't follow releases); and with no
 * previous snapshot nothing is sent (the sitemap already lists every page).
 */
export function changedUrls(records: ExtensionRecord[], previous: Snapshot | null): string[] {
	if (!previous) return [];
	const before = new Map(previous.extensions.map((r) => [r.id, r.version]));
	const now = new Set(records.map((r) => r.id));
	const ids = [
		...records.filter((r) => before.get(r.id) !== r.version).map((r) => r.id),
		...previous.extensions.filter((r) => !now.has(r.id)).map((r) => r.id)
	];
	return ids.map((id) => `${SITE}/extensions/${encodeURIComponent(id)}`);
}

/** Sends the URLs; never throws, so a failed ping can't fail the sync. Returns how many went. */
export async function submitToIndexNow(
	urls: string[],
	log: (message: string) => void,
	deps: NetDeps
): Promise<number> {
	if (urls.length === 0) return 0;
	const urlList = urls.slice(0, MAX_URLS);
	try {
		const res = await deps.fetch(ENDPOINT, {
			method: 'POST',
			headers: { 'content-type': 'application/json; charset=utf-8' },
			body: JSON.stringify({
				host: new URL(SITE).host,
				key: INDEXNOW_KEY,
				keyLocation: `${SITE}/${INDEXNOW_KEY}.txt`,
				urlList
			}),
			signal: AbortSignal.timeout(TIMEOUT_MS)
		});
		// 200 = accepted, 202 = accepted while the key file is still being checked
		if (res.ok) {
			log(`IndexNow: submitted ${urlList.length} URLs (${res.status})`);
			return urlList.length;
		}
		log(`IndexNow refused ${urlList.length} URLs (${res.status})`);
		return 0;
	} catch (err) {
		log(`IndexNow failed: ${(err as Error).message}`);
		return 0;
	}
}
