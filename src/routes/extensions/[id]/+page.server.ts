import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getExtensionWithVersions } from '$lib/server/zed-api.js';
import {
	getRepoMetadata,
	getReadmeMarkdown,
	getLanguageDocsMarkdown,
	getGitHubUser
} from '$lib/server/github-api.js';
import { renderMarkdown } from '$lib/server/markdown.js';
import { getSnapshot } from '$lib/server/snapshot.js';
import { parseRepoUrl } from '$lib/utils/parse-repo-url.js';
import type { GitHubRepo } from '$lib/types.js';

export interface DetailContent {
	github: GitHubRepo | null;
	readmeHtml: string | null;
	zedDocsHtml: string | null;
	zedDocsUrl: string | null;
	repoOwnerAvatar: string | null;
}

export const load: PageServerLoad = async ({ params, setHeaders, isDataRequest }) => {
	setHeaders({
		// Fresh for a day (READMEs and stats change slowly; the snapshot syncs daily), then served
		// stale for up to 30 days while refreshing in the background, so visitors rarely wait
		'cache-control': 'public, s-maxage=86400, stale-while-revalidate=2592000'
	});

	const extensionRequest = getExtensionWithVersions(params.id);
	// Handled when awaited below; this only stops an early rejection being reported as unhandled
	extensionRequest.catch(() => {});

	// The snapshot (in memory) already knows the repo, so GitHub work can start alongside Zed's
	const known = (await getSnapshot()).index.byId.get(params.id);
	const early = known ? loadContent(params.id, known.repository) : null;

	const extData = await extensionRequest;
	if (!extData) throw error(404, `Extension "${params.id}" not found`);

	const { extension, versions } = extData;
	const parsed = parseRepoUrl(extension.repository);
	const isMonorepo = parsed?.owner === 'zed-industries' && parsed?.repo === 'zed';

	const content =
		early && known?.repository === extension.repository
			? early
			: loadContent(extension.id, extension.repository);

	return {
		extension,
		versions,
		isMonorepo,
		repoOwner: parsed?.owner ?? null,
		// In-app navigation streams the GitHub content; full page loads (and crawlers) get it inline
		content: isDataRequest ? content : await content
	};
};

/** Everything that comes from GitHub. Never rejects: failures render as "no README". */
async function loadContent(id: string, repository: string | null): Promise<DetailContent> {
	const empty: DetailContent = {
		github: null,
		readmeHtml: null,
		zedDocsHtml: null,
		zedDocsUrl: null,
		repoOwnerAvatar: null
	};

	try {
		const parsed = parseRepoUrl(repository ?? '');
		const isMonorepo = parsed?.owner === 'zed-industries' && parsed?.repo === 'zed';

		const [langDocsMarkdown, repoMeta, readmeMarkdown, repoOwnerUser] = await Promise.all([
			getLanguageDocsMarkdown(id),
			parsed && !isMonorepo ? getRepoMetadata(parsed.owner, parsed.repo) : null,
			parsed && !isMonorepo ? getReadmeMarkdown(parsed.owner, parsed.repo) : null,
			parsed ? getGitHubUser(parsed.owner) : null
		]);

		const zedDocsHtml = langDocsMarkdown
			? await renderMarkdown(langDocsMarkdown, 'zed-industries', 'zed', 'main')
			: null;

		let readmeHtml: string | null = null;
		if (parsed && !isMonorepo && readmeMarkdown) {
			const branch = repoMeta?.default_branch ?? 'main';
			readmeHtml = await renderMarkdown(readmeMarkdown, parsed.owner, parsed.repo, branch);
		}

		return {
			github: parsed && !isMonorepo ? repoMeta : null,
			readmeHtml,
			zedDocsHtml,
			zedDocsUrl: zedDocsHtml ? `https://zed.dev/docs/languages/${id}` : null,
			repoOwnerAvatar: repoOwnerUser?.avatar_url ?? null
		};
	} catch (err) {
		console.error(`Failed to load GitHub content for ${id}:`, err);
		return empty;
	}
}
