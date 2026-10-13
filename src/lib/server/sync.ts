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
/** First release date lookups per sync, so a slow Zed API can't push the sync past its time limit */
const FIRST_PUBLISHED_LIMIT = 300;
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

let activeSync: Promise<SyncResult | SyncSkipped> | null = null;

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

export function toRecord(
	ext: ZedExtension,
	github: GitHubStats | null,
	firstPublishedAt: string | null = null
): ExtensionRecord {
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
		first_published_at: firstPublishedAt,
		version: ext.version,
		repository: ext.repository ?? null
	};
}

export async function fetchSnapshot(
	url: string,
	fetchImpl: (url: string) => Promise<Response> = (u) => fetch(u)
): Promise<Snapshot> {
	const res = await fetchImpl(url);
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
 * whose lookup failed this run (renamed, deleted, transient error), and its
 * first release dates for extensions not looked up this run.
 */
export function buildRecords(
	extensions: ZedExtension[],
	github: Map<string, GitHubStats | null>,
	previous: Snapshot | null,
	firstPublished: Map<string, string> = new Map()
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
		const first = firstPublished.get(ext.id) ?? prev?.first_published_at ?? null;
		return toRecord(ext, stats, first);
	});

	return { records, carriedForward };
}

export interface DownloadHistory {
	/** UTC day of the sync, YYYY-MM-DD */
	date: string;
	downloads: Record<string, number>;
}

/** Only needs Zed's counts, so it can be saved before (and without) GitHub and the snapshot */
export function buildHistory(
	at: string,
	extensions: Pick<ZedExtension, 'id' | 'download_count'>[]
): DownloadHistory {
	return {
		date: at.slice(0, 10),
		downloads: Object.fromEntries(extensions.map((e) => [e.id, e.download_count]))
	};
}

/**
 * Extensions still without a first release date, up to `limit`. Dates never change, so
 * each one is looked up once; the cap spreads the initial backfill over a few syncs.
 */
export function idsNeedingFirstPublished(
	extensions: ZedExtension[],
	firstPublished: Map<string, string>,
	previous: Snapshot | null,
	limit: number
): string[] {
	const known = new Set(previous?.extensions.filter((r) => r.first_published_at).map((r) => r.id));
	return extensions
		.map((e) => e.id)
		.filter((id) => !firstPublished.has(id) && !known.has(id))
		.slice(0, limit);
}

/**
 * Throws instead of letting a broken run replace a good snapshot or record a short
 * history day (a partial day-7 file would skew Trending; a missing one is just skipped).
 */
export function assertPublishable(records: { id: string }[], previous: Snapshot | null): void {
	if (records.length === 0) throw new Error('Refusing to publish an empty snapshot');
	if (previous && records.length < previous.extensions.length * MIN_RETAINED_RATIO) {
		throw new Error(
			`Refusing to publish: ${records.length} extensions vs ${previous.extensions.length} in the previous snapshot`
		);
	}
}

// --- Network steps ---

async function fetchRegistryIds(log: LogFn, deps: NetDeps): Promise<string[]> {
	const res = await deps.fetch(EXTENSIONS_TOML_URL);
	if (!res.ok) throw new Error(`Failed to fetch extensions.toml: ${res.status}`);
	const ids = Object.keys(parseToml(await res.text()));
	log(`Registry: ${ids.length} extensions in extensions.toml`);
	return ids;
}

/** Fail the sync rather than publish a snapshot missing more than this share of lookups. */
const MAX_FAILED_LOOKUP_RATIO = 0.02;

/**
 * Every published version of one extension, oldest first, or [] if it was removed.
 * Sorted here rather than trusting the API's order.
 */
async function fetchVersions(id: string, deps: NetDeps): Promise<ZedExtension[]> {
	return withRetry(async () => {
		const res = await deps.fetch(`${ZED_API}/extensions/${id}`);
		if (isTransient(res.status)) throw new Error(`Zed API ${res.status} for ${id}`);
		if (!res.ok) throw new FatalError(`Zed API ${res.status} for ${id}`);
		const data: ZedExtensionResponse = await res.json();
		return data.data.toSorted((a, b) => a.published_at.localeCompare(b.published_at));
	}, deps);
}

export async function fetchZedExtensions(
	ids: string[],
	log: LogFn,
	deps: NetDeps = defaultDeps
): Promise<{ extensions: ZedExtension[]; lookedUp: number; firstPublished: Map<string, string> }> {
	// The bulk endpoint caps at 1,000 results; look up the rest one by one
	const bulk = await withRetry(async () => {
		const res = await deps.fetch(`${ZED_API}/extensions?max_schema_version=1`);
		if (!res.ok) throw new Error(`Zed API error: ${res.status}`);
		return (await res.json()) as ZedExtensionResponse;
	}, deps);
	const byId = new Map(bulk.data.map((ext) => [ext.id, ext]));
	// A lookup returns every version, so it gives the first release date for free
	const firstPublished = new Map<string, string>();

	const missing = ids.filter((id) => !byId.has(id));
	let failed = 0;
	await mapConcurrent(missing, ZED_CONCURRENCY, async (id) => {
		try {
			const versions = await fetchVersions(id, deps);
			// An empty result means the extension was removed: not a failure
			if (versions.length === 0) return;
			byId.set(id, versions[versions.length - 1]);
			firstPublished.set(id, versions[0].published_at);
		} catch {
			failed++;
		}
	});

	const lookedUp = byId.size - bulk.data.length;
	log(
		`Zed API: ${bulk.data.length} bulk + ${lookedUp}/${missing.length} looked up, ${failed} failed`
	);
	if (failed > Math.max(3, missing.length * MAX_FAILED_LOOKUP_RATIO)) {
		throw new Error(`Too many Zed lookups failed (${failed}/${missing.length})`);
	}
	return { extensions: [...byId.values()], lookedUp, firstPublished };
}

/**
 * First release dates for extensions that don't have one yet (bulk entries only carry
 * their latest version). A failed lookup is just retried on the next sync.
 */
export async function fetchFirstPublished(
	ids: string[],
	log: LogFn,
	deps: NetDeps = defaultDeps
): Promise<Map<string, string>> {
	const first = new Map<string, string>();
	await mapConcurrent(ids, ZED_CONCURRENCY, async (id) => {
		try {
			const versions = await fetchVersions(id, deps);
			if (versions.length > 0) first.set(id, versions[0].published_at);
		} catch {
			// left null; the next sync tries again
		}
	});
	if (ids.length > 0) log(`First release dates: ${first.size}/${ids.length} looked up`);
	return first;
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

type PutFn = (
	path: string,
	body: string,
	options: Parameters<typeof put>[2]
) => Promise<{ url: string }>;

interface SyncOptions {
	env?: NodeJS.ProcessEnv;
	log?: LogFn;
	/** Injectable network and Blob writes, for tests */
	deps?: NetDeps;
	put?: PutFn;
	/** The backup cron: do nothing if today's history file was already saved */
	onlyIfHistoryMissing?: boolean;
}

export async function runSync(options: SyncOptions = {}): Promise<SyncResult | SyncSkipped> {
	if (activeSync) return activeSync;
	activeSync = sync(options).finally(() => {
		activeSync = null;
	});
	return activeSync;
}

export interface SyncSkipped {
	skipped: string;
}

/** True only when the file is definitely there; any doubt means run the sync. */
async function historyExists(
	snapshotUrl: string,
	date: string,
	deps: NetDeps,
	log: LogFn
): Promise<boolean> {
	try {
		const url = new URL(`${HISTORY_PREFIX}${date}.json`, snapshotUrl);
		url.searchParams.set('nc', String(Date.now()));
		const res = await deps.fetch(url.toString(), { method: 'HEAD' });
		if (!res.ok && res.status !== 404) log(`History check got ${res.status} for ${date}`);
		return res.ok;
	} catch {
		return false;
	}
}

async function sync(options: SyncOptions): Promise<SyncResult | SyncSkipped> {
	const config = getSyncConfig(options.env ?? process.env);
	const log = options.log ?? console.log;
	const deps = options.deps ?? defaultDeps;
	const write: PutFn = options.put ?? put;
	const start = new Date();

	if (options.onlyIfHistoryMissing && config.snapshotUrl) {
		const today = start.toISOString().slice(0, 10);
		if (await historyExists(config.snapshotUrl, today, deps, log)) {
			log(`History for ${today} already saved; backup sync not needed`);
			return { skipped: `History for ${today} already saved` };
		}
		log(`History for ${today} is missing; running the backup sync`);
	}

	log('=== ZedExt Sync ===');

	// If a snapshot should exist but can't be read, stop: the guard and carry-forward depend on it
	const previous = config.snapshotUrl
		? await fetchSnapshot(config.snapshotUrl, (u) => deps.fetch(u))
		: null;
	log(
		previous
			? `Previous snapshot: ${previous.extensions.length} extensions`
			: 'No previous snapshot'
	);

	const ids = await fetchRegistryIds(log, deps);
	const { extensions, lookedUp, firstPublished } = await fetchZedExtensions(ids, log, deps);

	// Saved first: lost days can't be backfilled, and the counts only need Zed, so an expired
	// GitHub token or a refused snapshot below still keeps the day. Retried, but a failure here
	// mustn't stop the snapshot. A second sync on the same day overwrites that day's file.
	assertPublishable(extensions, previous);
	const history = buildHistory(new Date().toISOString(), extensions);
	let historySaved = true;
	try {
		await withRetry(
			() =>
				write(`${HISTORY_PREFIX}${history.date}.json`, JSON.stringify(history), {
					access: 'public',
					addRandomSuffix: false,
					// The backup run never replaces the midnight counts, even if its check was wrong
					allowOverwrite: !options.onlyIfHistoryMissing,
					contentType: 'application/json',
					token: config.blobToken
				}),
			deps
		);
		log(`History saved for ${history.date}`);
	} catch (err) {
		historySaved = false;
		log(`History write failed for ${history.date}: ${(err as Error).message}`);
	}

	const needFirst = idsNeedingFirstPublished(
		extensions,
		firstPublished,
		previous,
		FIRST_PUBLISHED_LIMIT
	);
	for (const [id, date] of await fetchFirstPublished(needFirst, log, deps)) {
		firstPublished.set(id, date);
	}

	const keys = [...new Set(extensions.map((e) => repoKey(e.repository)).filter((k) => k !== null))];
	const github = await fetchGitHubStats(keys, config.githubToken, log, deps);

	const { records, carriedForward } = buildRecords(extensions, github, previous, firstPublished);

	assertPublishable(records, previous);

	const snapshot: Snapshot = { generatedAt: new Date().toISOString(), extensions: records };
	const blob = await write(SNAPSHOT_PATH, JSON.stringify(snapshot), {
		access: 'public',
		addRandomSuffix: false,
		allowOverwrite: true,
		contentType: 'application/json',
		// Blob defaults to a one-month CDN cache; readers should see a new sync within minutes
		cacheControlMaxAge: 300,
		token: config.blobToken
	});

	// Theme previews come last: the snapshot above is what the site depends on, so slow or
	// failing downloads can only ever cost previews, never the snapshot or history.
	const previews = await syncPreviews(records, config, start.getTime(), log, deps, write);

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
	log: LogFn,
	deps: NetDeps,
	write: PutFn
): Promise<{ downloaded: number; failed: number; pending: number; saved: boolean }> {
	const skipped = { downloaded: 0, failed: 0, pending: 0, saved: false };
	const previous = config.snapshotUrl
		? await loadPreviousPreviews(new URL(PREVIEWS_PATH, config.snapshotUrl), (u) => deps.fetch(u))
		: { ok: true, bundle: null };
	// Rebuilding from nothing would overwrite a good bundle with a partial one
	if (!previous.ok) {
		log('Theme previews skipped: the previous bundle exists but could not be read');
		return skipped;
	}

	const result = await buildPreviews(records, previous.bundle, {
		limit: config.previewLimit,
		log,
		deadline: startedAt + PREVIEW_DEADLINE_MS,
		deps
	});
	if (previewsShrank(result.bundle, previous.bundle)) {
		log('Theme previews not written: the bundle lost more than 10% of its themes');
		return { ...result, saved: false };
	}

	try {
		await withRetry(
			() =>
				write(PREVIEWS_PATH, JSON.stringify(result.bundle), {
					access: 'public',
					addRandomSuffix: false,
					allowOverwrite: true,
					contentType: 'application/json',
					cacheControlMaxAge: 300,
					token: config.blobToken
				}),
			deps
		);
		return { ...result, saved: true };
	} catch (err) {
		log(`Theme previews write failed: ${(err as Error).message}`);
		return { ...result, saved: false };
	}
}
