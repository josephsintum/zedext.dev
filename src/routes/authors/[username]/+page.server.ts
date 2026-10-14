import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getGitHubUser } from '$lib/server/github-api.js';
import { requireSnapshot } from '$lib/server/snapshot.js';
import { parseRepoUrl } from '$lib/utils/parse-repo-url.js';
import type { GitHubUser } from '$lib/types.js';

export type AuthorProfile = Pick<
	GitHubUser,
	'login' | 'name' | 'html_url' | 'bio' | 'company' | 'location'
> & { avatar_url: string | null };

const COMPLETE_CACHE = 'public, s-maxage=3600, stale-while-revalidate=86400';
// A username-only profile: refresh it soon rather than keep it for an hour
const PARTIAL_CACHE = 'public, s-maxage=600, stale-while-revalidate=86400';
const DEGRADED_CACHE = 'public, s-maxage=60';

export const load: PageServerLoad = async ({ params, setHeaders }) => {
	const username = params.username.toLowerCase();

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

	// The extensions come from the snapshot, so an author with some never needs GitHub to
	// answer: a failed or missing (e.g. renamed) profile falls back to the username alone
	if (!lookup.user && extensions.length === 0) {
		if (!lookup.ok) throw error(503, 'GitHub is temporarily unavailable');
		throw error(404, `Author "${params.username}" not found`);
	}

	const user = lookup.user ? pickProfile(lookup.user) : usernameOnly(username);
	setHeaders({
		'cache-control': degraded ? DEGRADED_CACHE : lookup.user ? COMPLETE_CACHE : PARTIAL_CACHE
	});
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
