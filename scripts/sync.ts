/**
 * Sync script: Zed API + GitHub API → Algolia index
 *
 * Usage: bun run scripts/sync.ts
 */

import { runAlgoliaSync } from '../src/lib/server/algolia-sync.js';

async function main() {
	const result = await runAlgoliaSync();
	console.log(result);
}

main().catch((err) => {
	console.error('Sync failed:', err);
	process.exit(1);
});
