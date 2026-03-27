import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getExtensionWithVersions } from '$lib/server/zed-api.js';
import { getRepoMetadata, getReadmeMarkdown, getLanguageDocsMarkdown } from '$lib/server/github-api.js';
import { renderMarkdown } from '$lib/server/markdown.js';
import { parseRepoUrl } from '$lib/server/parse-repo-url.js';

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

	// Try Zed language docs for all extensions (cached 24h)
	const langDocsMarkdown = await getLanguageDocsMarkdown(extension.id);
	if (langDocsMarkdown) {
		zedDocsHtml = await renderMarkdown(langDocsMarkdown, 'zed-industries', 'zed', 'main');
	}

	// Fetch GitHub data for non-monorepo extensions
	if (parsed && !isMonorepo) {
		const [repoMeta, readmeData] = await Promise.all([
			getRepoMetadata(parsed.owner, parsed.repo),
			getReadmeMarkdown(parsed.owner, parsed.repo)
		]);

		github = repoMeta;

		if (readmeData) {
			const branch = readmeData.defaultBranch;
			readmeHtml = await renderMarkdown(readmeData.markdown, parsed.owner, parsed.repo, branch);
		}
	}

	const zedDocsUrl = zedDocsHtml
		? `https://zed.dev/docs/languages/${extension.id}`
		: null;

	return {
		extension,
		versions,
		github,
		readmeHtml,
		zedDocsHtml,
		zedDocsUrl,
		isMonorepo
	};
};
