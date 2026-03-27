export function parseRepoUrl(url: string): { owner: string; repo: string } | null {
	if (!url) return null;
	const match = url.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/);
	if (!match) return null;
	return { owner: match[1], repo: match[2] };
}
