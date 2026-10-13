import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireSnapshot } from '$lib/server/snapshot.js';
import { getChangelog } from '$lib/server/github-api.js';
import { renderMarkdown } from '$lib/server/markdown.js';
import { changelogRepo } from '$lib/server/changelog-sync.js';
import type { ExtensionRecord } from '$lib/types.js';

/**
 * The Changelog tab's content, fetched when the tab is opened rather than on every page
 * view, so pages don't spend GitHub API calls on a tab most visitors never click.
 */
export const GET: RequestHandler = async ({ params }) => {
	const { index } = await requireSnapshot();
	const record = index.byId.get(params.id) as ExtensionRecord | undefined;
	const repo = record?.changelog ? changelogRepo(record) : null;
	if (!repo) return json({ error: 'No changelog' }, { status: 404 });

	try {
		const changelog = await getChangelog(repo.owner, repo.repo);
		if (!changelog) return json({ error: 'No changelog' }, { status: 404 });
		const html = await renderMarkdown(changelog.markdown, repo.owner, repo.repo, 'HEAD');
		return json(
			{ html, url: changelog.url },
			{ headers: { 'cache-control': 'public, s-maxage=86400, stale-while-revalidate=604800' } }
		);
	} catch (err) {
		console.error(`Changelog failed for ${params.id}:`, err);
		return json(
			{ error: 'Changelog is temporarily unavailable' },
			{ status: 503, headers: { 'cache-control': 'public, s-maxage=60' } }
		);
	}
};
