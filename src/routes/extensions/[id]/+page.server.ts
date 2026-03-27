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
import { parseRepoUrl } from '$lib/utils/parse-repo-url.js';

export const load: PageServerLoad = async ({ params, setHeaders }) => {
	setHeaders({
		'cache-control': 'public, s-maxage=3600, stale-while-revalidate=86400'
	});

	// Fetch extension data from Zed API
	const extData = await getExtensionWithVersions(params.id);
	if (!extData) throw error(404, `Extension "${params.id}" not found`);

	const { extension, versions } = extData;
	const parsed = parseRepoUrl(extension.repository);

	// Fetch GitHub data in parallel (if repo URL exists and isn't the Zed monorepo)
	const isMonorepo = parsed?.owner === 'zed-industries' && parsed?.repo === 'zed';

	let github = null;
	let readmeHtml: string | null = null;
	let zedDocsHtml: string | null = null;

	// Fetch all external data in parallel
	const [langDocsMarkdown, repoMeta, readmeMarkdown, repoOwnerUser] = await Promise.all([
		getLanguageDocsMarkdown(extension.id),
		parsed && !isMonorepo ? getRepoMetadata(parsed.owner, parsed.repo) : null,
		parsed && !isMonorepo ? getReadmeMarkdown(parsed.owner, parsed.repo) : null,
		parsed ? getGitHubUser(parsed.owner) : null
	]);

	if (langDocsMarkdown) {
		zedDocsHtml = await renderMarkdown(langDocsMarkdown, 'zed-industries', 'zed', 'main');
	}

	if (parsed && !isMonorepo) {
		github = repoMeta;
		if (readmeMarkdown) {
			const branch = repoMeta?.default_branch ?? 'main';
			readmeHtml = await renderMarkdown(readmeMarkdown, parsed.owner, parsed.repo, branch);
		}
	}

	const zedDocsUrl = zedDocsHtml ? `https://zed.dev/docs/languages/${extension.id}` : null;

	return {
		extension,
		versions,
		github,
		readmeHtml,
		zedDocsHtml,
		zedDocsUrl,
		isMonorepo,
		repoOwner: parsed?.owner ?? null,
		repoOwnerAvatar: repoOwnerUser?.avatar_url ?? null
	};
};
