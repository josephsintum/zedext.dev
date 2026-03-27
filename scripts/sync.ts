/**
 * Sync script: Zed API + GitHub API → Algolia index
 *
 * Usage: bun run scripts/sync.ts
 *
 * Fetches all extensions from:
 * 1. extensions.toml (complete list of all extension IDs)
 * 2. Zed API (extension metadata + download counts)
 * 3. GitHub API (stars, license, forks for each extension)
 *
 * Then pushes enriched documents to Algolia.
 */

import { algoliasearch } from 'algoliasearch';
import { parse as parseToml } from 'smol-toml';
import { parseRepoUrl } from '../src/lib/server/parse-repo-url.js';
import { parseAuthorNames } from '../src/lib/server/parse-author.js';
import type {
	ZedExtension,
	ZedExtensionResponse,
	AlgoliaExtension,
	GitHubRepo
} from '../src/lib/types.js';

// --- Config ---

const ZED_API = 'https://api.zed.dev';
const GITHUB_API = 'https://api.github.com';
const EXTENSIONS_TOML_URL =
	'https://raw.githubusercontent.com/zed-industries/extensions/main/extensions.toml';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const ALGOLIA_APP_ID = process.env.PUBLIC_ALGOLIA_APP_ID;
const ALGOLIA_ADMIN_KEY = process.env.ALGOLIA_ADMIN_KEY;

if (!ALGOLIA_APP_ID || !ALGOLIA_ADMIN_KEY) {
	console.error('Missing ALGOLIA env vars. Copy .env.example to .env and fill in values.');
	process.exit(1);
}

const algoliaClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY);

// --- Rate limiting ---

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- Step 1: Fetch all extension IDs from extensions.toml ---

async function fetchAllExtensionIds(): Promise<string[]> {
	console.log('Fetching extensions.toml...');
	const res = await fetch(EXTENSIONS_TOML_URL);
	if (!res.ok) throw new Error(`Failed to fetch extensions.toml: ${res.status}`);
	const text = await res.text();
	const toml = parseToml(text);
	const ids = Object.keys(toml);
	console.log(`Found ${ids.length} extensions in extensions.toml`);
	return ids;
}

// --- Step 2: Fetch extensions from Zed API ---

async function fetchZedExtensions(): Promise<Map<string, ZedExtension>> {
	console.log('Fetching from Zed API...');
	const res = await fetch(`${ZED_API}/extensions?max_schema_version=1`);
	if (!res.ok) throw new Error(`Zed API error: ${res.status}`);
	const data: ZedExtensionResponse = await res.json();
	const map = new Map<string, ZedExtension>();
	for (const ext of data.data) {
		map.set(ext.id, ext);
	}
	console.log(`Got ${map.size} extensions from Zed API`);
	return map;
}

async function fetchZedExtensionById(id: string): Promise<ZedExtension | null> {
	try {
		const res = await fetch(`${ZED_API}/extensions/${id}`);
		if (!res.ok) return null;
		const data: ZedExtensionResponse = await res.json();
		if (data.data.length === 0) return null;
		// Return the latest version (first in array, sorted by published_at desc)
		return data.data[0];
	} catch {
		return null;
	}
}

// --- Step 3: Fetch GitHub metadata ---

async function fetchGitHubRepo(owner: string, repo: string): Promise<GitHubRepo | null> {
	try {
		const headers: Record<string, string> = { Accept: 'application/vnd.github.v3+json' };
		if (GITHUB_TOKEN) headers.Authorization = `token ${GITHUB_TOKEN}`;

		const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, { headers });
		if (!res.ok) return null;
		return await res.json();
	} catch {
		return null;
	}
}

// --- Step 4: Transform to Algolia documents ---

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

// --- Step 5: Configure Algolia index ---

async function configureAlgoliaIndex(): Promise<void> {
	console.log('Configuring Algolia index settings...');
	await algoliaClient.setSettings({
		indexName: 'extensions',
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

// --- Main ---

async function main() {
	const startTime = Date.now();
	console.log('=== ZedExt Sync ===\n');

	// Step 1: Get all extension IDs
	const allIds = await fetchAllExtensionIds();

	// Step 2: Fetch from Zed API (bulk)
	const zedExtensions = await fetchZedExtensions();

	// Step 3: Fetch missing extensions individually
	const missingIds = allIds.filter((id) => !zedExtensions.has(id));
	console.log(`\nFetching ${missingIds.length} extensions not in bulk API...`);
	let fetched = 0;
	for (const id of missingIds) {
		const ext = await fetchZedExtensionById(id);
		if (ext) {
			zedExtensions.set(id, ext);
			fetched++;
		}
		if (fetched % 50 === 0 && fetched > 0) {
			console.log(`  ...fetched ${fetched}/${missingIds.length}`);
		}
		await sleep(100); // 10 req/sec
	}
	console.log(`Fetched ${fetched} additional extensions`);

	// Step 4: Enrich with GitHub metadata
	console.log(`\nFetching GitHub metadata for ${zedExtensions.size} extensions...`);
	const docs: AlgoliaExtension[] = [];
	let githubFetched = 0;
	let githubSkipped = 0;

	for (const ext of zedExtensions.values()) {
		const parsed = parseRepoUrl(ext.repository);
		let github: GitHubRepo | null = null;

		if (parsed) {
			// Skip the main Zed monorepo — stars/forks are for Zed, not the extension
			if (parsed.owner === 'zed-industries' && parsed.repo === 'zed') {
				githubSkipped++;
			} else {
				github = await fetchGitHubRepo(parsed.owner, parsed.repo);
				githubFetched++;
				if (githubFetched % 100 === 0) {
					console.log(`  ...GitHub: ${githubFetched} fetched`);
				}
				await sleep(750); // ~1.3 req/sec to stay within 5000/hr
			}
		} else {
			githubSkipped++;
		}

		docs.push(toAlgoliaDoc(ext, github));
	}

	console.log(`GitHub: ${githubFetched} fetched, ${githubSkipped} skipped`);

	// Step 5: Push to Algolia
	console.log(`\nPushing ${docs.length} documents to Algolia...`);
	await configureAlgoliaIndex();

	// Batch in chunks of 1000
	const BATCH_SIZE = 1000;
	for (let i = 0; i < docs.length; i += BATCH_SIZE) {
		const batch = docs.slice(i, i + BATCH_SIZE);
		await algoliaClient.saveObjects({
			indexName: 'extensions',
			objects: batch
		});
		console.log(`  Pushed batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} docs)`);
	}

	const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
	console.log(`\n=== Sync complete: ${docs.length} extensions in ${elapsed}s ===`);
}

main().catch((err) => {
	console.error('Sync failed:', err);
	process.exit(1);
});
