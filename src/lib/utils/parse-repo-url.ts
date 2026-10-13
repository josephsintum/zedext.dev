/**
 * Owner and repo of a github.com URL. Anchored to the host: repository URLs come from
 * extension authors, and a look-alike (evil.example/github.com/zed-industries/zed) must not
 * borrow another repo's stars or badges.
 */
export function parseRepoUrl(url: string): { owner: string; repo: string } | null {
	if (!url) return null;
	const match = url.match(/^https?:\/\/(?:www\.)?github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/i);
	if (!match) return null;
	return { owner: match[1], repo: match[2] };
}
