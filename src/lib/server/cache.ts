const memoryCache = new Map<string, { data: unknown; expiry: number }>();

export async function getCached<T>(
	key: string,
	ttlMs: number,
	fetcher: () => Promise<T>
): Promise<T> {
	const mem = memoryCache.get(key);
	if (mem && Date.now() < mem.expiry) {
		return mem.data as T;
	}

	const data = await fetcher();
	memoryCache.set(key, { data, expiry: Date.now() + ttlMs });

	return data;
}
