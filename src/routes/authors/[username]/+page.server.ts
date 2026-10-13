import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getGitHubUser } from '$lib/server/github-api.js';
import { getSnapshot } from '$lib/server/snapshot.js';
import { parseRepoUrl } from '$lib/utils/parse-repo-url.js';

export const load: PageServerLoad = async ({ params, setHeaders }) => {
	setHeaders({
		'cache-control': 'public, s-maxage=3600, stale-while-revalidate=86400'
	});

	const username = params.username.toLowerCase();

	const [user, { snapshot }] = await Promise.all([getGitHubUser(username), getSnapshot()]);

	if (!user) throw error(404, `Author "${params.username}" not found`);

	// Pick only the fields we need to avoid serializing the full GitHub response
	const { login, name, avatar_url, html_url, bio, company, location } = user;
	const profile = { login, name, avatar_url, html_url, bio, company, location };

	const extensions = snapshot.extensions
		.filter((ext) => parseRepoUrl(ext.repository ?? '')?.owner.toLowerCase() === username)
		.sort((a, b) => b.download_count - a.download_count);

	return { user: profile, extensions };
};
