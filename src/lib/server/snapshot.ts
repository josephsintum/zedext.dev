import { env } from '$env/dynamic/private';
import { createIndex, type SearchIndex } from '$lib/search/engine.js';
import { fetchSnapshot, toRecord } from './sync.js';
import { getAllExtensions } from './zed-api.js';
import type { Snapshot } from '$lib/types.js';

const FRESH_MS = 10 * 60 * 1000;
const RETRY_MS = 60 * 1000;

export interface LoadedSnapshot {
	snapshot: Snapshot;
	index: SearchIndex;
	/** True when built from the Zed API because the Blob snapshot was unavailable. */
	degraded: boolean;
}

let current: (LoadedSnapshot & { expires: number }) | null = null;
let pending: Promise<LoadedSnapshot> | null = null;

/** The extension snapshot and its search index, cached in memory per server instance. */
export function getSnapshot(): Promise<LoadedSnapshot> {
	if (current && Date.now() < current.expires) return Promise.resolve(current);
	pending ??= refresh().finally(() => {
		pending = null;
	});
	return pending;
}

async function refresh(): Promise<LoadedSnapshot> {
	try {
		if (!env.SNAPSHOT_URL) throw new Error('SNAPSHOT_URL is not configured');
		return keep(await fetchSnapshot(env.SNAPSHOT_URL), false, FRESH_MS);
	} catch (err) {
		console.error('Snapshot load failed:', err);
		// Stale data beats no data; retry Blob again soon
		if (current) {
			current.expires = Date.now() + RETRY_MS;
			return current;
		}
		// Cold start with Blob unreachable: Zed's bulk list (no GitHub stats, max 1,000)
		const extensions = (await getAllExtensions()).map((ext) => toRecord(ext, null));
		return keep({ generatedAt: new Date().toISOString(), extensions }, true, RETRY_MS);
	}
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
