import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { SearchIndex } from '$lib/search/engine.js';
import { createIndex } from '$lib/search/create-index.js';
import { fetchSnapshot, toRecord } from './sync.js';
import { getAllExtensions } from './zed-api.js';
import type { Snapshot } from '$lib/types.js';

const FRESH_MS = 10 * 60 * 1000;
const RETRY_MS = 60 * 1000;
const SNAPSHOT_TIMEOUT_MS = 10_000;

export interface LoadedSnapshot {
	snapshot: Snapshot;
	index: SearchIndex;
	/** True when built from the Zed API because the Blob snapshot was unavailable. */
	degraded: boolean;
}

let current: (LoadedSnapshot & { expires: number }) | null = null;
let pending: Promise<LoadedSnapshot> | null = null;

/**
 * The extension snapshot and its search index, cached in memory per server instance.
 * Once loaded, an expired copy is returned immediately while a refresh runs in the
 * background, so no request waits on Blob after the first. Rejects only when nothing
 * has ever loaded and both Blob and the Zed API fail.
 */
export function getSnapshot(): Promise<LoadedSnapshot> {
	if (current) {
		if (Date.now() >= current.expires) refreshOnce().catch(() => {});
		return Promise.resolve(current);
	}
	return refreshOnce();
}

/** For routes: like getSnapshot, but a total outage becomes an (uncached) 503. */
export async function requireSnapshot(): Promise<LoadedSnapshot> {
	try {
		return await getSnapshot();
	} catch {
		throw error(503, 'Extension data is temporarily unavailable');
	}
}

function refreshOnce(): Promise<LoadedSnapshot> {
	pending ??= refresh().finally(() => {
		pending = null;
	});
	return pending;
}

async function refresh(): Promise<LoadedSnapshot> {
	try {
		if (!env.SNAPSHOT_URL) throw new Error('SNAPSHOT_URL is not configured');
		// A hung Blob read falls through to the stale copy or the Zed fallback below
		const snapshot = await fetchSnapshot(env.SNAPSHOT_URL, (url) =>
			fetch(url, { signal: AbortSignal.timeout(SNAPSHOT_TIMEOUT_MS) })
		);
		// Same sync as the copy we hold: keep the built index
		if (current && !current.degraded && current.snapshot.generatedAt === snapshot.generatedAt) {
			current.expires = Date.now() + FRESH_MS;
			return current;
		}
		return keep(snapshot, false, FRESH_MS);
	} catch (err) {
		console.error('Snapshot load failed:', err);
		// A real snapshot, even a stale one, beats the reduced fallback
		if (current && !current.degraded) return retrySoon(current);
		try {
			return keep(await zedFallback(), true, RETRY_MS);
		} catch (fallbackErr) {
			console.error('Zed fallback failed:', fallbackErr);
			if (current) return retrySoon(current);
			throw fallbackErr;
		}
	}
}

/** Zed's bulk list: no GitHub stats and at most 1,000 entries, but enough to browse. */
async function zedFallback(): Promise<Snapshot> {
	const extensions = (await getAllExtensions()).map((ext) => toRecord(ext, null));
	if (extensions.length === 0) throw new Error('Zed API returned no extensions');
	return { generatedAt: new Date().toISOString(), extensions };
}

function retrySoon(loaded: LoadedSnapshot & { expires: number }): LoadedSnapshot {
	loaded.expires = Date.now() + RETRY_MS;
	return loaded;
}

function keep(snapshot: Snapshot, degraded: boolean, ttl: number): LoadedSnapshot {
	current = {
		snapshot,
		index: createIndex(snapshot.extensions),
		degraded,
		expires: Date.now() + ttl
	};
	return current;
}
