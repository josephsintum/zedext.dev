/**
 * Sync script: Zed API + GitHub API → snapshot in Vercel Blob
 *
 * Usage: bun run scripts/sync.ts
 */

import { runSync } from '../src/lib/server/sync.js';

async function main() {
	const result = await runSync();
	console.log(result);
}

main().catch((err) => {
	console.error('Sync failed:', err);
	process.exit(1);
});
