import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getGitHubUser } from '$lib/server/github-api.js';
import { requireSnapshot } from '$lib/server/snapshot.js';
import { parseRepoUrl } from '$lib/utils/parse-repo-url.js';
import type { GitHubUser } from '$lib/types.js';
import type { Config } from '@sveltejs/adapter-vercel';

// Cached by Vercel ISR like extension pages, refreshed in the background once a day. ISR never
// caches a 5xx (it keeps the last good copy and retries), so a failed GitHub lookup or a
// degraded snapshot fails with 503 rather than being cached for a day.
export const config: Config = { isr: { expiration: 86400, allowQuery: [] } };

export type AuthorProfile = Pick<
	GitHubUser,
	'login' | 'name' | 'html_url' | 'bio' | 'company' | 'location'
> & { avatar_url: string | null };

export const load: PageServerLoad = async ({ params }) => {
	const username = params.username.toLowerCase();
	// One URL (and one cache entry) per author, whatever the spelling
	if (params.username !== username) redirect(308, `/authors/${username}`);

	const [lookup, { snapshot, degraded }] = await Promise.all([
		getGitHubUser(username).then(
			(user) => ({ ok: true as const, user }),
			(err) => {
				console.error(`GitHub user lookup failed for ${username}:`, err);
				return { ok: false as const, user: null };
			}
		),
		requireSnapshot()
	]);

	const extensions = snapshot.extensions
		.filter((ext) => parseRepoUrl(ext.repository ?? '')?.owner.toLowerCase() === username)
		.sort((a, b) => b.download_count - a.download_count);

	if (!lookup.ok || degraded) throw error(503, 'GitHub is temporarily unavailable');
	// A missing (e.g. renamed) profile with extensions falls back to the username alone
	if (!lookup.user && extensions.length === 0) {
		throw error(404, `Author "${params.username}" not found`);
	}

	const user = lookup.user ? pickProfile(lookup.user) : usernameOnly(username);
	return { user, extensions };
};

// Only the fields the page uses, so the full GitHub response isn't serialized
function pickProfile(user: GitHubUser): AuthorProfile {
	const { login, name, avatar_url, html_url, bio, company, location } = user;
	return { login, name, avatar_url, html_url, bio, company, location };
}

function usernameOnly(login: string): AuthorProfile {
	return {
		login,
		name: null,
		avatar_url: null,
		html_url: `https://github.com/${login}`,
		bio: null,
		company: null,
		location: null
	};
}
