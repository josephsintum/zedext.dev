/**
 * Builds the extension snapshot (Zed registry + Zed API + GitHub) and writes it to Vercel Blob.
 *
 * No SvelteKit imports: this also runs standalone via `bun run scripts/sync.ts`.
 */

import { put } from '@vercel/blob';
import { parse as parseToml } from 'smol-toml';
import { parseRepoUrl } from '../utils/parse-repo-url.js';
import { parseAuthorNames } from '../utils/parse-author.js';
import type { ExtensionRecord, Snapshot, ZedExtension, ZedExtensionResponse } from '../types.js';
import {
	buildPreviews,
	loadPreviousPreviews,
	previewsShrank,
	PREVIEWS_PATH
} from './previews-sync.js';
import {
	defaultDeps,
	FatalError,
	isTransient,
	mapConcurrent,
	withRetry,
	type NetDeps
} from './net.js';

export type { NetDeps } from './net.js';

const ZED_API = 'https://api.zed.dev';
const GITHUB_GRAPHQL = 'https://api.github.com/graphql';
const EXTENSIONS_TOML_URL =
	'https://raw.githubusercontent.com/zed-industries/extensions/main/extensions.toml';
export const SNAPSHOT_PATH = 'extensions.json';
/** One small file per day of download counts, for trending and charts later. Never deleted. */
export const HISTORY_PREFIX = 'history/';
const ZED_CONCURRENCY = 10;
const GITHUB_BATCH_SIZE = 100;
/** Refuse to publish a snapshot that shrank by more than this. */
const MIN_RETAINED_RATIO = 0.9;

type LogFn = (message: string) => void;

export interface GitHubStats {
	github_stars: number;
	github_license: string | null;
	github_pushed_at: string | null;
}

export interface SyncResult {
	startedAt: string;
	completedAt: string;
	elapsedSeconds: number;
	url: string;
	total: number;
	missingFetched: number;
	githubRepos: number;
	githubCarriedForward: number;
	historySaved: boolean;
	previewsDownloaded: number;
	previewsFailed: number;
	previewsPending: number;
	previewsSaved: boolean;
}

interface SyncConfig {
	githubToken: string;
	blobToken: string;
	snapshotUrl?: string;
	previewLimit: number;
}

let activeSync: Promise<SyncResult> | null = null;

function getSyncConfig(env: NodeJS.ProcessEnv): SyncConfig {
	const githubToken = env.GITHUB_TOKEN;
	const blobToken = env.BLOB_READ_WRITE_TOKEN;
	if (!githubToken) throw new Error('Missing GITHUB_TOKEN (GitHub GraphQL requires a token)');
	if (!blobToken) throw new Error('Missing BLOB_READ_WRITE_TOKEN');
	return {
		githubToken,
		blobToken,
		snapshotUrl: env.SNAPSHOT_URL || undefined,
		previewLimit: Number(env.PREVIEW_DOWNLOAD_LIMIT) || 150
	};
}

// --- Shared with the runtime loader ---

export function toRecord(ext: ZedExtension, github: GitHubStats | null): ExtensionRecord {
	return {
		id: ext.id,
		name: ext.name,
		description: ext.description,
		authors: parseAuthorNames(ext.authors),
		provides: ext.provides,
		download_count: ext.download_count,
		github_stars: github?.github_stars ?? 0,
		github_license: github?.github_license ?? null,
		github_pushed_at: github?.github_pushed_at ?? null,
		published_at: ext.published_at,
		version: ext.version,
		repository: ext.repository ?? null
	};
}

export async function fetchSnapshot(url: string): Promise<Snapshot> {
	const res = await fetch(url);
	if (!res.ok) throw new Error(`Snapshot fetch failed: ${res.status}`);
	const snapshot = (await res.json()) as Snapshot;
	if (!Array.isArray(snapshot?.extensions) || snapshot.extensions.length === 0) {
		throw new Error('Snapshot is empty or malformed');
	}
	return snapshot;
}

// --- Pure steps (unit tested) ---

/** Repo key for GitHub lookups, or null for repos we don't fetch stats for. */
export function repoKey(repository: string | null | undefined): string | null {
	const parsed = parseRepoUrl(repository ?? '');
	if (!parsed) return null;
	// Built-in extensions live in the Zed monorepo; its stars would be misleading
	if (parsed.owner === 'zed-industries' && parsed.repo === 'zed') return null;
	return `${parsed.owner}/${parsed.repo}`.toLowerCase();
}

/**
 * Builds records, keeping the previous snapshot's GitHub fields for any repo
 * whose lookup failed this run (renamed, deleted, transient error).
 */
export function buildRecords(
	extensions: ZedExtension[],
	github: Map<string, GitHubStats | null>,
	previous: Snapshot | null
): { records: ExtensionRecord[]; carriedForward: number } {
	const prevById = new Map(previous?.extensions.map((r) => [r.id, r]));
	let carriedForward = 0;

	const records = extensions.map((ext) => {
		const key = repoKey(ext.repository);
		let stats = key ? (github.get(key) ?? null) : null;
		const prev = prevById.get(ext.id);
		if (key && !stats && prev) {
			stats = {
				github_stars: prev.github_stars,
				github_license: prev.github_license,
				github_pushed_at: prev.github_pushed_at
			};
			carriedForward++;
		}
		return toRecord(ext, stats);
	});

	return { records, carriedForward };
}

export interface DownloadHistory {
	/** UTC day of the sync, YYYY-MM-DD */
	date: string;
	downloads: Record<string, number>;
}

export function buildHistory(snapshot: Snapshot): DownloadHistory {
	return {
		date: snapshot.generatedAt.slice(0, 10),
		downloads: Object.fromEntries(snapshot.extensions.map((r) => [r.id, r.download_count]))
	};
}

/** Throws instead of letting a broken run replace a good snapshot. */
export function assertPublishable(records: ExtensionRecord[], previous: Snapshot | null): void {
	if (records.length === 0) throw new Error('Refusing to publish an empty snapshot');
	if (previous && records.length < previous.extensions.length * MIN_RETAINED_RATIO) {
		throw new Error(
			`Refusing to publish: ${records.length} extensions vs ${previous.extensions.length} in the previous snapshot`
		);
	}
}

// --- Network steps ---

async function fetchRegistryIds(log: LogFn): Promise<string[]> {
	const res = await fetch(EXTENSIONS_TOML_URL);
	if (!res.ok) throw new Error(`Failed to fetch extensions.toml: ${res.status}`);
	const ids = Object.keys(parseToml(await res.text()));
	log(`Registry: ${ids.length} extensions in extensions.toml`);
	return ids;
}

/** Fail the sync rather than publish a snapshot missing more than this share of lookups. */
const MAX_FAILED_LOOKUP_RATIO = 0.02;

export async function fetchZedExtensions(
	ids: string[],
	log: LogFn,
	deps: NetDeps = defaultDeps
): Promise<{ extensions: ZedExtension[]; lookedUp: number }> {
	// The bulk endpoint caps at 1,000 results; look up the rest one by one
	const bulk = await withRetry(async () => {
		const res = await deps.fetch(`${ZED_API}/extensions?max_schema_version=1`);
		if (!res.ok) throw new Error(`Zed API error: ${res.status}`);
		return (await res.json()) as ZedExtensionResponse;
	}, deps);
	const byId = new Map(bulk.data.map((ext) => [ext.id, ext]));

	const missing = ids.filter((id) => !byId.has(id));
	let failed = 0;
	const fetched = await mapConcurrent(missing, ZED_CONCURRENCY, async (id) => {
		try {
			return await withRetry(async () => {
				const res = await deps.fetch(`${ZED_API}/extensions/${id}`);
				if (isTransient(res.status)) throw new Error(`Zed API ${res.status} for ${id}`);
				if (!res.ok) throw new FatalError(`Zed API ${res.status} for ${id}`);
				const data: ZedExtensionResponse = await res.json();
				// An empty result means the extension was removed: not a failure
				return data.data[0] ?? null;
			}, deps);
		} catch {
			failed++;
			return null;
		}
	});
	for (const ext of fetched) if (ext) byId.set(ext.id, ext);

	const lookedUp = byId.size - bulk.data.length;
	log(
		`Zed API: ${bulk.data.length} bulk + ${lookedUp}/${missing.length} looked up, ${failed} failed`
	);
	if (failed > Math.max(3, missing.length * MAX_FAILED_LOOKUP_RATIO)) {
		throw new Error(`Too many Zed lookups failed (${failed}/${missing.length})`);
	}
	return { extensions: [...byId.values()], lookedUp };
}

type GraphQLRepo = {
	stargazerCount: number;
	pushedAt: string | null;
	licenseInfo: { spdxId: string } | null;
} | null;

/**
 * One GraphQL query per 100 repos. A null entry means the lookup failed for that repo,
 * so the previous snapshot's stats carry forward. A batch that still fails after retries
 * only nulls its own repos; the sync fails only if every batch failed.
 */
export async function fetchGitHubStats(
	keys: string[],
	token: string,
	log: LogFn,
	deps: NetDeps = defaultDeps
): Promise<Map<string, GitHubStats | null>> {
	const stats = new Map<string, GitHubStats | null>();
	let batches = 0;
	let failedBatches = 0;

	for (let i = 0; i < keys.length; i += GITHUB_BATCH_SIZE) {
		const batch = keys.slice(i, i + GITHUB_BATCH_SIZE);
		batches++;
		const fields = batch
			.map((key, j) => {
				const [owner, name] = key.split('/');
				return `r${j}: repository(owner: ${JSON.stringify(owner)}, name: ${JSON.stringify(name)}) { stargazerCount pushedAt licenseInfo { spdxId } }`;
			})
			.join('\n');

		try {
			const data = await withRetry(async () => {
				const res = await deps.fetch(GITHUB_GRAPHQL, {
					method: 'POST',
					headers: { Authorization: `bearer ${token}`, 'Content-Type': 'application/json' },
					body: JSON.stringify({ query: `query {\n${fields}\n}` })
				});
				// A rejected token fails the whole sync rather than publishing zeroed stars
				if (res.status === 401) throw new FatalError('GITHUB_TOKEN was rejected (401)');
				if (!res.ok) throw new Error(`GitHub GraphQL error: ${res.status}`);
				// Missing repos come back as null alongside NOT_FOUND errors; that's expected
				const body: { data?: Record<string, GraphQLRepo> } = await res.json();
				if (!body.data) throw new Error('GitHub GraphQL returned no data');
				return body.data;
			}, deps);

			batch.forEach((key, j) => {
				const repo = data[`r${j}`];
				stats.set(
					key,
					repo
						? {
								github_stars: repo.stargazerCount,
								github_license: repo.licenseInfo?.spdxId ?? null,
								github_pushed_at: repo.pushedAt
							}
						: null
				);
			});
		} catch (err) {
			if (err instanceof FatalError) throw err;
			failedBatches++;
			log(`GitHub batch ${batches} failed, keeping previous stats: ${(err as Error).message}`);
			for (const key of batch) stats.set(key, null);
		}
	}

	if (batches > 0 && failedBatches === batches) {
		throw new Error('GitHub GraphQL failed for every batch');
	}
	log(`GitHub: ${[...stats.values()].filter(Boolean).length}/${keys.length} repos resolved`);
	return stats;
}

// --- Entry point ---

export async function runSync(
	options: { env?: NodeJS.ProcessEnv; log?: LogFn } = {}
): Promise<SyncResult> {
	if (activeSync) return activeSync;
	activeSync = sync(options).finally(() => {
		activeSync = null;
	});
	return activeSync;
}

async function sync(options: { env?: NodeJS.ProcessEnv; log?: LogFn }): Promise<SyncResult> {
	const config = getSyncConfig(options.env ?? process.env);
	const log = options.log ?? console.log;
	const start = new Date();

	log('=== ZedExt Sync ===');

	// If a snapshot should exist but can't be read, stop: the guard and carry-forward depend on it
	const previous = config.snapshotUrl ? await fetchSnapshot(config.snapshotUrl) : null;
	log(
		previous
			? `Previous snapshot: ${previous.extensions.length} extensions`
			: 'No previous snapshot'
	);

	const ids = await fetchRegistryIds(log);
	const { extensions, lookedUp } = await fetchZedExtensions(ids, log);

	const keys = [...new Set(extensions.map((e) => repoKey(e.repository)).filter((k) => k !== null))];
	const github = await fetchGitHubStats(keys, config.githubToken, log);

	const { records, carriedForward } = buildRecords(extensions, github, previous);

	assertPublishable(records, previous);

	const snapshot: Snapshot = { generatedAt: new Date().toISOString(), extensions: records };
	const blob = await put(SNAPSHOT_PATH, JSON.stringify(snapshot), {
		access: 'public',
		addRandomSuffix: false,
		allowOverwrite: true,
		contentType: 'application/json',
		// Blob defaults to a one-month CDN cache; readers should see a new sync within minutes
		cacheControlMaxAge: 300,
		token: config.blobToken
	});

	// Lost days can't be backfilled, so retry; but a failure here mustn't undo the publish above.
	// A second sync on the same day overwrites that day's file.
	const history = buildHistory(snapshot);
	let historySaved = true;
	try {
		await withRetry(
			() =>
				put(`${HISTORY_PREFIX}${history.date}.json`, JSON.stringify(history), {
					access: 'public',
					addRandomSuffix: false,
					allowOverwrite: true,
					contentType: 'application/json',
					token: config.blobToken
				}),
			defaultDeps
		);
		log(`History saved for ${history.date}`);
	} catch (err) {
		historySaved = false;
		log(`History write failed for ${history.date}: ${(err as Error).message}`);
	}

	// Theme previews come last: the snapshot above is what the site depends on, so slow or
	// failing downloads can only ever cost previews, never the snapshot or history.
	const previews = await syncPreviews(records, config, start.getTime(), log);

	const completedAt = new Date();
	const elapsedSeconds = Number(((completedAt.getTime() - start.getTime()) / 1000).toFixed(1));
	log(`=== Published ${records.length} extensions in ${elapsedSeconds}s → ${blob.url} ===`);

	return {
		startedAt: start.toISOString(),
		completedAt: completedAt.toISOString(),
		elapsedSeconds,
		url: blob.url,
		total: records.length,
		missingFetched: lookedUp,
		githubRepos: keys.length,
		githubCarriedForward: carriedForward,
		historySaved,
		previewsDownloaded: previews.downloaded,
		previewsFailed: previews.failed,
		previewsPending: previews.pending,
		previewsSaved: previews.saved
	};
}

/** Leave time for the bundle write before the 300 s function limit (/api/sync maxDuration). */
const PREVIEW_DEADLINE_MS = 220_000;

async function syncPreviews(
	records: ExtensionRecord[],
	config: SyncConfig,
	startedAt: number,
	log: LogFn
): Promise<{ downloaded: number; failed: number; pending: number; saved: boolean }> {
	const skipped = { downloaded: 0, failed: 0, pending: 0, saved: false };
	const previous = config.snapshotUrl
		? await loadPreviousPreviews(new URL(PREVIEWS_PATH, config.snapshotUrl))
		: { ok: true, bundle: null };
	// Rebuilding from nothing would overwrite a good bundle with a partial one
	if (!previous.ok) {
		log('Theme previews skipped: the previous bundle exists but could not be read');
		return skipped;
	}

	const result = await buildPreviews(records, previous.bundle, {
		limit: config.previewLimit,
		log,
		deadline: startedAt + PREVIEW_DEADLINE_MS
	});
	if (previewsShrank(result.bundle, previous.bundle)) {
		log('Theme previews not written: the bundle lost more than 10% of its themes');
		return { ...result, saved: false };
	}

	try {
		await withRetry(
			() =>
				put(PREVIEWS_PATH, JSON.stringify(result.bundle), {
					access: 'public',
					addRandomSuffix: false,
					allowOverwrite: true,
					contentType: 'application/json',
					cacheControlMaxAge: 300,
					token: config.blobToken
				}),
			defaultDeps
		);
		return { ...result, saved: true };
	} catch (err) {
		log(`Theme previews write failed: ${(err as Error).message}`);
		return { ...result, saved: false };
	}
}
