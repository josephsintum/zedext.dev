import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getExtensionWithVersions } from '$lib/server/zed-api.js';
import {
	getRepoMetadata,
	getReadmeMarkdown,
	getLanguageDocsMarkdown,
	getGitHubUser,
	getChangelog
} from '$lib/server/github-api.js';
import { renderMarkdown } from '$lib/server/markdown.js';
import { getSnapshot } from '$lib/server/snapshot.js';
import { getPreviews } from '$lib/server/previews.js';
import { findSimilar } from '$lib/search/similar.js';
import { parseRepoUrl } from '$lib/utils/parse-repo-url.js';
import type { ExtensionRecord, GitHubRepo } from '$lib/types.js';

export interface DetailContent {
	github: GitHubRepo | null;
	readmeHtml: string | null;
	zedDocsHtml: string | null;
	zedDocsUrl: string | null;
	changelogHtml: string | null;
	/** Where "Full changelog on GitHub →" points */
	changelogUrl: string | null;
	repoOwnerAvatar: string | null;
	/** False when a GitHub request failed (as opposed to "no README"), so the page isn't cached long. */
	complete: boolean;
}

// Fresh for a day (READMEs and stats change slowly; the snapshot syncs daily), then served
// stale for up to 30 days while refreshing in the background, so visitors rarely wait
const COMPLETE_CACHE = 'public, s-maxage=86400, stale-while-revalidate=2592000';
// Streamed pages send headers before GitHub answers, so a failed README could be cached;
// a short fresh window bounds that, while stale-while-revalidate keeps visits instant
const STREAMED_CACHE = 'public, s-maxage=600, stale-while-revalidate=2592000';
const DEGRADED_CACHE = 'public, s-maxage=60';

export const load: PageServerLoad = async ({ params, setHeaders, isDataRequest }) => {
	const extensionRequest = getExtensionWithVersions(params.id);
	// Handled when awaited below; this only stops an early rejection being reported as unhandled
	extensionRequest.catch(() => {});
	// Cached bundle (or null); fetched alongside Zed's data, never fails the page
	const previewsRequest = getPreviews();
	// From the in-memory index; never fails the page
	const similarRequest: Promise<ExtensionRecord[]> = getSnapshot()
		.then((s) => findSimilar(s.index, params.id, 6))
		.catch(() => []);

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

	const base = {
		extension,
		versions,
		isMonorepo,
		repoOwner: parsed?.owner ?? null,
		themePreview: (await previewsRequest)?.themes[extension.id]?.variants ?? null,
		iconPreview: (await previewsRequest)?.icons[extension.id]?.variants ?? null,
		similar: await similarRequest
	};

	// In-app navigation streams the GitHub content; full page loads (and crawlers) get it inline
	if (isDataRequest) {
		setHeaders({ 'cache-control': STREAMED_CACHE });
		return { ...base, content };
	}

	const resolved = await content;
	setHeaders({ 'cache-control': resolved.complete ? COMPLETE_CACHE : DEGRADED_CACHE });
	return { ...base, content: resolved };
};

/** Everything that comes from GitHub. Never rejects: failures render as "no README". */
async function loadContent(id: string, repository: string | null): Promise<DetailContent> {
	const parsed = parseRepoUrl(repository ?? '');
	const isMonorepo = parsed?.owner === 'zed-industries' && parsed?.repo === 'zed';
	const ownRepo = parsed && !isMonorepo ? parsed : null;

	const [langDocs, repoMeta, readme, owner, changelog] = await Promise.allSettled([
		getLanguageDocsMarkdown(id),
		ownRepo ? getRepoMetadata(ownRepo.owner, ownRepo.repo) : null,
		ownRepo ? getReadmeMarkdown(ownRepo.owner, ownRepo.repo) : null,
		parsed ? getGitHubUser(parsed.owner) : null,
		ownRepo ? getChangelog(ownRepo.owner, ownRepo.repo) : null
	]);
	const value = <T>(r: PromiseSettledResult<T>) => (r.status === 'fulfilled' ? r.value : null);
	let complete = [langDocs, repoMeta, readme, owner, changelog].every(
		(r) => r.status === 'fulfilled'
	);
	if (!complete) console.error(`GitHub request failed for ${id}`);

	const github = value(repoMeta);
	let zedDocsHtml: string | null = null;
	let readmeHtml: string | null = null;
	let changelogHtml: string | null = null;
	try {
		const docsMarkdown = value(langDocs);
		if (docsMarkdown) {
			zedDocsHtml = await renderMarkdown(docsMarkdown, 'zed-industries', 'zed', 'main');
		}
		const readmeMarkdown = value(readme);
		if (ownRepo && readmeMarkdown) {
			const branch = github?.default_branch ?? 'main';
			readmeHtml = await renderMarkdown(readmeMarkdown, ownRepo.owner, ownRepo.repo, branch);
		}
		const changelogData = value(changelog);
		if (ownRepo && changelogData) {
			const branch = github?.default_branch ?? 'main';
			changelogHtml = await renderMarkdown(
				changelogData.markdown,
				ownRepo.owner,
				ownRepo.repo,
				branch
			);
		}
	} catch (err) {
		console.error(`Markdown render failed for ${id}:`, err);
		complete = false;
	}

	return {
		github,
		readmeHtml,
		zedDocsHtml,
		zedDocsUrl: zedDocsHtml ? `https://zed.dev/docs/languages/${id}` : null,
		changelogHtml,
		changelogUrl: changelogHtml ? (value(changelog)?.url ?? null) : null,
		repoOwnerAvatar: value(owner)?.avatar_url ?? null,
		complete
	};
}
