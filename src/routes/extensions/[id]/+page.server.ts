import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getExtensionWithVersions } from '$lib/server/zed-api.js';
import {
	getRepoMetadata,
	getReadme,
	getLanguageDocsMarkdown,
	getGitHubUser
} from '$lib/server/github-api.js';
import { renderMarkdown } from '$lib/server/markdown.js';
import { getSnapshot } from '$lib/server/snapshot.js';
import { getPreviews } from '$lib/server/previews.js';
import { parseRepoUrl } from '$lib/utils/parse-repo-url.js';
import { isThemeLike } from '$lib/kinds.js';
import type { GitHubRepo } from '$lib/types.js';
import type { Config } from '@sveltejs/adapter-vercel';

// Cached by Vercel ISR: kept for the whole deployment and shared by every region (the CDN
// cache alone is per region and drops pages few people visit), refreshed in the background
// once a day. Only ?tab= changes the page; other query strings share the cached copy.
// A failed GitHub request is cached like any other page until the next refresh.
export const config: Config = { isr: { expiration: 86400, allowQuery: ['tab'] } };

export interface DetailContent {
	github: GitHubRepo | null;
	readmeHtml: string | null;
	zedDocsHtml: string | null;
	zedDocsUrl: string | null;
	repoOwnerAvatar: string | null;
}

export const load: PageServerLoad = async ({ params }) => {
	const extensionRequest = getExtensionWithVersions(params.id);
	// Handled when awaited below; this only stops an early rejection being reported as unhandled
	extensionRequest.catch(() => {});
	// The sync records which extensions have a changelog; the tab loads it when opened
	const changelogRequest = getSnapshot()
		.then((s) => Boolean(s.index.byId.get(params.id)?.changelog))
		.catch(() => false);

	// The snapshot usually knows the repo already, so GitHub work can start alongside Zed's.
	// It's only a hint: never wait on it or fail because of it.
	let started: { repository: string | null; promise: Promise<DetailContent> } | undefined;
	const contentFor = (repository: string | null) => {
		if (started?.repository !== repository) {
			started = { repository, promise: loadContent(params.id, repository) };
		}
		return started.promise;
	};
	getSnapshot()
		.then((s) => {
			const known = s.index.byId.get(params.id);
			if (known && !started) contentFor(known.repository);
		})
		.catch(() => {});

	let extData: Awaited<typeof extensionRequest>;
	try {
		extData = await extensionRequest;
	} catch (err) {
		console.error(`Zed API failed for ${params.id}:`, err);
		throw error(503, 'Extension data is temporarily unavailable');
	}
	if (!extData) throw error(404, `Extension "${params.id}" not found`);

	const { extension, versions } = extData;
	const parsed = parseRepoUrl(extension.repository);
	const isMonorepo = parsed?.owner === 'zed-industries' && parsed?.repo === 'zed';

	// Reuses the early request when the snapshot's repo URL matches; otherwise starts it now
	const content = contentFor(extension.repository);

	// Only themes and icon themes need the (cached) previews bundle; it never fails the page
	const hasPreview = isThemeLike(extension.provides);
	const previews = hasPreview ? await getPreviews() : null;

	return {
		extension,
		versions,
		isMonorepo,
		repoOwner: parsed?.owner ?? null,
		themePreview: previews?.themes[extension.id]?.variants ?? null,
		iconPreview: previews?.icons[extension.id]?.variants ?? null,
		hasChangelog: await changelogRequest,
		content: await content
	};
};

/** Everything that comes from GitHub. Never rejects: failures render as "no README". */
async function loadContent(id: string, repository: string | null): Promise<DetailContent> {
	const parsed = parseRepoUrl(repository ?? '');
	const isMonorepo = parsed?.owner === 'zed-industries' && parsed?.repo === 'zed';
	const ownRepo = parsed && !isMonorepo ? parsed : null;

	const [langDocs, repoMeta, readme, owner] = await Promise.allSettled([
		getLanguageDocsMarkdown(id),
		ownRepo ? getRepoMetadata(ownRepo.owner, ownRepo.repo) : null,
		ownRepo ? getReadme(ownRepo.owner, ownRepo.repo) : null,
		parsed ? getGitHubUser(parsed.owner) : null
	]);
	const value = <T>(r: PromiseSettledResult<T>) => (r.status === 'fulfilled' ? r.value : null);
	if ([langDocs, repoMeta, readme, owner].some((r) => r.status === 'rejected')) {
		console.error(`GitHub request failed for ${id}`);
	}

	const github = value(repoMeta);
	let zedDocsHtml: string | null = null;
	let readmeHtml: string | null = null;
	try {
		const docsMarkdown = value(langDocs);
		if (docsMarkdown) {
			// Relative links go to the published docs on zed.dev, like the "Zed docs" link
			zedDocsHtml = await renderMarkdown(docsMarkdown, {
				owner: 'zed-industries',
				repo: 'zed',
				branch: 'main',
				dir: 'docs/src/languages',
				idPrefix: 'docs-',
				siteBase: 'https://zed.dev/docs/languages/'
			});
		}
		const readmeFile = value(readme);
		if (ownRepo && readmeFile) {
			readmeHtml = await renderMarkdown(readmeFile.markdown, {
				owner: ownRepo.owner,
				repo: ownRepo.repo,
				branch: github?.default_branch ?? 'main',
				dir: readmeFile.dir,
				idPrefix: 'readme-'
			});
		}
	} catch (err) {
		console.error(`Markdown render failed for ${id}:`, err);
	}

	return {
		github,
		readmeHtml,
		zedDocsHtml,
		zedDocsUrl: zedDocsHtml ? `https://zed.dev/docs/languages/${id}` : null,
		repoOwnerAvatar: value(owner)?.avatar_url ?? null
	};
}
