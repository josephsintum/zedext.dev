import { algoliasearch } from 'algoliasearch';
import { parse as parseToml } from 'smol-toml';
import { parseRepoUrl } from '../utils/parse-repo-url.js';
import { parseAuthorNames } from './parse-author.js';
import type { AlgoliaExtension, GitHubRepo, ZedExtension, ZedExtensionResponse } from '../types.js';

const ZED_API = 'https://api.zed.dev';
const GITHUB_API = 'https://api.github.com';
const EXTENSIONS_TOML_URL =
	'https://raw.githubusercontent.com/zed-industries/extensions/main/extensions.toml';
const DEFAULT_INDEX_NAME = 'extensions';
const GITHUB_DELAY_MS = 750; // ~1.3 req/sec → stays under 5,000/hr GitHub limit
const ZED_DELAY_MS = 100; // 10 req/sec for missing extensions (small set)
const BATCH_SIZE = 1000;

type LogFn = (message: string) => void;

export interface AlgoliaSyncResult {
	startedAt: string;
	completedAt: string;
	elapsedSeconds: number;
	indexName: string;
	totalDocs: number;
	totalBatches: number;
	missingIds: number;
	missingFetched: number;
	githubFetched: number;
	githubSkipped: number;
}

interface SyncConfig {
	githubToken?: string;
	algoliaAppId: string;
	algoliaAdminKey: string;
	indexName: string;
}

let activeSync: Promise<AlgoliaSyncResult> | null = null;

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function getSyncConfig(env: NodeJS.ProcessEnv): SyncConfig {
	const algoliaAppId = env.PUBLIC_ALGOLIA_APP_ID;
	const algoliaAdminKey = env.ALGOLIA_ADMIN_KEY;

	if (!algoliaAppId || !algoliaAdminKey) {
		throw new Error('Missing Algolia env vars: PUBLIC_ALGOLIA_APP_ID and ALGOLIA_ADMIN_KEY');
	}

	return {
		githubToken: env.GITHUB_TOKEN,
		algoliaAppId,
		algoliaAdminKey,
		indexName: env.ALGOLIA_INDEX_NAME || DEFAULT_INDEX_NAME
	};
}

function githubHeaders(token?: string): Record<string, string> {
	const headers: Record<string, string> = { Accept: 'application/vnd.github.v3+json' };
	if (token) headers.Authorization = `token ${token}`;
	return headers;
}

async function fetchAllExtensionIds(log: LogFn): Promise<string[]> {
	log('Fetching extensions.toml...');
	const res = await fetch(EXTENSIONS_TOML_URL);
	if (!res.ok) throw new Error(`Failed to fetch extensions.toml: ${res.status}`);

	const text = await res.text();
	const toml = parseToml(text);
	const ids = Object.keys(toml);
	log(`Found ${ids.length} extensions in extensions.toml`);
	return ids;
}

async function fetchZedExtensions(log: LogFn): Promise<Map<string, ZedExtension>> {
	log('Fetching from Zed API...');
	const res = await fetch(`${ZED_API}/extensions?max_schema_version=1`);
	if (!res.ok) throw new Error(`Zed API error: ${res.status}`);

	const data: ZedExtensionResponse = await res.json();
	const extensions = new Map<string, ZedExtension>();

	for (const ext of data.data) {
		extensions.set(ext.id, ext);
	}

	log(`Got ${extensions.size} extensions from Zed API`);
	return extensions;
}

async function fetchZedExtensionById(id: string): Promise<ZedExtension | null> {
	try {
		const res = await fetch(`${ZED_API}/extensions/${id}`);
		if (!res.ok) return null;

		const data: ZedExtensionResponse = await res.json();
		return data.data[0] ?? null;
	} catch {
		return null;
	}
}

async function fetchGitHubRepo(
	owner: string,
	repo: string,
	githubToken?: string
): Promise<GitHubRepo | null> {
	try {
		const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, {
			headers: githubHeaders(githubToken)
		});
		if (!res.ok) return null;
		return await res.json();
	} catch {
		return null;
	}
}

function toAlgoliaDoc(ext: ZedExtension, github: GitHubRepo | null): AlgoliaExtension {
	return {
		objectID: ext.id,
		name: ext.name,
		description: ext.description,
		authors: parseAuthorNames(ext.authors),
		provides: ext.provides,
		download_count: ext.download_count,
		github_stars: github?.stargazers_count ?? 0,
		github_license: github?.license?.spdx_id ?? null,
		github_pushed_at: github?.pushed_at ?? null,
		published_at: ext.published_at,
		published_at_timestamp: Math.floor(new Date(ext.published_at).getTime() / 1000),
		version: ext.version,
		repository: ext.repository ?? null
	};
}

async function configureAlgoliaIndex(
	client: ReturnType<typeof algoliasearch>,
	indexName: string,
	log: LogFn
): Promise<void> {
	log(`Configuring Algolia index settings for "${indexName}"...`);
	await client.setSettings({
		indexName,
		indexSettings: {
			searchableAttributes: ['name', 'objectID', 'description', 'authors'],
			attributesForFaceting: ['searchable(provides)', 'searchable(github_license)'],
			customRanking: ['desc(download_count)', 'desc(github_stars)'],
			typoTolerance: true,
			minWordSizefor1Typo: 4,
			minWordSizefor2Typos: 8,
			hitsPerPage: 24,
			paginationLimitedTo: 1000
		}
	});
}

async function runAlgoliaSyncOnce(options: {
	env?: NodeJS.ProcessEnv;
	log?: LogFn;
}): Promise<AlgoliaSyncResult> {
	const config = getSyncConfig(options.env ?? process.env);
	const log = options.log ?? console.log;
	const client = algoliasearch(config.algoliaAppId, config.algoliaAdminKey);
	const start = new Date();
	const startTime = Date.now();

	log('=== ZedExt Sync ===');

	const allIds = await fetchAllExtensionIds(log);
	const zedExtensions = await fetchZedExtensions(log);

	const missingIds = allIds.filter((id) => !zedExtensions.has(id));
	log(`Fetching ${missingIds.length} extensions not in bulk API...`);

	let missingFetched = 0;
	for (const id of missingIds) {
		const ext = await fetchZedExtensionById(id);
		if (ext) {
			zedExtensions.set(id, ext);
			missingFetched++;
		}

		if (missingFetched > 0 && missingFetched % 50 === 0) {
			log(`  ...missing extensions fetched: ${missingFetched}/${missingIds.length}`);
		}

		await sleep(ZED_DELAY_MS);
	}

	log(`Fetched ${missingFetched} additional extensions`);
	log(`Fetching GitHub metadata for ${zedExtensions.size} extensions...`);

	const docs: AlgoliaExtension[] = [];
	let githubFetched = 0;
	let githubSkipped = 0;

	for (const ext of zedExtensions.values()) {
		const parsed = parseRepoUrl(ext.repository);
		let github: GitHubRepo | null = null;

		if (parsed) {
			if (parsed.owner === 'zed-industries' && parsed.repo === 'zed') {
				githubSkipped++;
			} else {
				github = await fetchGitHubRepo(parsed.owner, parsed.repo, config.githubToken);
				githubFetched++;

				if (githubFetched % 100 === 0) {
					log(`  ...GitHub repos fetched: ${githubFetched}`);
				}

				await sleep(GITHUB_DELAY_MS);
			}
		} else {
			githubSkipped++;
		}

		docs.push(toAlgoliaDoc(ext, github));
	}

	log(`GitHub: ${githubFetched} fetched, ${githubSkipped} skipped`);
	log(`Pushing ${docs.length} documents to Algolia...`);

	await configureAlgoliaIndex(client, config.indexName, log);

	let totalBatches = 0;
	for (let i = 0; i < docs.length; i += BATCH_SIZE) {
		const batch = docs.slice(i, i + BATCH_SIZE);
		await client.saveObjects({
			indexName: config.indexName,
			objects: batch as unknown as Array<Record<string, unknown>>
		});

		totalBatches++;
		log(`  Pushed batch ${totalBatches} (${batch.length} docs)`);
	}

	const elapsedSeconds = Number(((Date.now() - startTime) / 1000).toFixed(1));
	const completedAt = new Date().toISOString();

	log(`=== Sync complete: ${docs.length} extensions in ${elapsedSeconds}s ===`);

	return {
		startedAt: start.toISOString(),
		completedAt,
		elapsedSeconds,
		indexName: config.indexName,
		totalDocs: docs.length,
		totalBatches,
		missingIds: missingIds.length,
		missingFetched,
		githubFetched,
		githubSkipped
	};
}

export async function runAlgoliaSync(
	options: {
		env?: NodeJS.ProcessEnv;
		log?: LogFn;
	} = {}
): Promise<AlgoliaSyncResult> {
	if (activeSync) {
		return activeSync;
	}

	activeSync = runAlgoliaSyncOnce(options).finally(() => {
		activeSync = null;
	});

	return activeSync;
}
