/**
 * In-memory cache for outside APIs (Zed, GitHub, Blob). Fresh entries are served from memory;
 * expired ones are refetched within the request (the CDN already serves pages stale while it
 * revalidates, so serving stale here too would only make that copy older). Concurrent misses
 * share one request, and if a refetch fails the last good value is served instead.
 */

interface Entry {
	/** Present once a fetch has succeeded */
	value?: { data: unknown };
	expiry: number;
	pending?: Promise<unknown>;
}

/** After a failed refetch, serve the old value this long before trying again. */
const RETRY_AFTER_MS = 60 * 1000;

const memoryCache = new Map<string, Entry>();

export function getCached<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
	const entry = memoryCache.get(key) ?? { expiry: 0 };
	if (entry.value && Date.now() < entry.expiry) return Promise.resolve(entry.value.data as T);
	if (entry.pending) return entry.pending as Promise<T>;

	const pending = fetcher().then(
		(data) => {
			memoryCache.set(key, { value: { data }, expiry: Date.now() + ttlMs });
			return data;
		},
		(err) => {
			if (!entry.value) {
				memoryCache.delete(key); // nothing to fall back on; the next request tries again
				throw err;
			}
			console.error(`Refreshing ${key} failed, serving the cached value:`, err);
			memoryCache.set(key, { value: entry.value, expiry: Date.now() + RETRY_AFTER_MS });
			return entry.value.data as T;
		}
	);
	memoryCache.set(key, { ...entry, pending });
	return pending;
}

/** For tests. */
export function clearCache(): void {
	memoryCache.clear();
}
