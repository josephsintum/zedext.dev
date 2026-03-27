import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getGitHubUser } from '$lib/server/github-api.js';
import { getAllExtensions } from '$lib/server/zed-api.js';
import { parseRepoUrl } from '$lib/utils/parse-repo-url.js';
import { parseAuthorNames } from '$lib/utils/parse-author.js';
import type { ExtensionHit } from '$lib/types.js';

export const load: PageServerLoad = async ({ params, setHeaders }) => {
	setHeaders({
		'cache-control': 'public, s-maxage=3600, stale-while-revalidate=86400'
	});

	const username = params.username.toLowerCase();

	const [user, allExtensions] = await Promise.all([getGitHubUser(username), getAllExtensions()]);

	if (!user) throw error(404, `Author "${params.username}" not found`);

	// Pick only the fields we need to avoid serializing the full GitHub response
	const { login, name, avatar_url, html_url, bio, company, location } = user;
	const profile = { login, name, avatar_url, html_url, bio, company, location };

	const extensions: ExtensionHit[] = allExtensions
		.filter((ext) => {
			const parsed = parseRepoUrl(ext.repository);
			return parsed?.owner.toLowerCase() === username;
		})
		.sort((a, b) => b.download_count - a.download_count)
		.map((ext) => ({
			objectID: ext.id,
			name: ext.name,
			description: ext.description,
			authors: parseAuthorNames(ext.authors),
			provides: ext.provides,
			download_count: ext.download_count,
			github_stars: 0,
			github_license: null,
			github_pushed_at: null,
			published_at: ext.published_at,
			published_at_timestamp: Math.floor(new Date(ext.published_at).getTime() / 1000),
			version: ext.version,
			repository: ext.repository
		}));

	return { user: profile, extensions };
};
