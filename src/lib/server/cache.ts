import { dev } from '$app/environment';
import { existsSync, readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const CACHE_DIR = '.cache';
const memoryCache = new Map<string, { data: unknown; expiry: number }>();

function hashKey(key: string): string {
	return createHash('md5').update(key).digest('hex');
}

function ensureCacheDir() {
	if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
}

export async function getCached<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
	// L1: in-memory
	const mem = memoryCache.get(key);
	if (mem && Date.now() < mem.expiry) {
		return mem.data as T;
	}

	// L2: filesystem (dev only)
	if (dev) {
		ensureCacheDir();
		const filePath = join(CACHE_DIR, `${hashKey(key)}.json`);
		if (existsSync(filePath)) {
			const stat = statSync(filePath);
			if (Date.now() - stat.mtimeMs < ttlMs) {
				try {
					const data = JSON.parse(readFileSync(filePath, 'utf-8')) as T;
					memoryCache.set(key, { data, expiry: Date.now() + ttlMs });
					return data;
				} catch { /* corrupted cache file, refetch */ }
			}
		}
	}

	// L3: fetch from source
	const data = await fetcher();
	memoryCache.set(key, { data, expiry: Date.now() + ttlMs });

	if (dev) {
		try {
			ensureCacheDir();
			writeFileSync(join(CACHE_DIR, `${hashKey(key)}.json`), JSON.stringify(data));
		} catch { /* non-critical */ }
	}

	return data;
}
