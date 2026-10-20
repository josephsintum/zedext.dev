import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('$env/dynamic/private', () => ({ env: {} }));
const { getChangelog, getReadme } = await import('./github-api.js');

type Route = (url: string) => Response;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
function stubFetch(route: Route) {
	const fn = vi.fn(async (input: string | URL | Request) => route(String(input)));
	vi.stubGlobal('fetch', fn);
	return fn;
}
afterEach(() => vi.unstubAllGlobals());

const release = (body: string) => ({
	tag_name: 'v1',
	name: null,
	body,
	published_at: '2026-10-09T12:00:00Z',
	draft: false
});

// Each test uses its own owner: results are cached in memory per repo
describe('getChangelog', () => {
	it("reads the repo's CHANGELOG.md from the raw host, linking to it on GitHub", async () => {
		stubFetch((url) =>
			url === 'https://raw.githubusercontent.com/a/r/HEAD/CHANGELOG.md'
				? new Response('# Changelog\n\n## 1.0.0\n\n- First')
				: json({}, 404)
		);
		expect(await getChangelog('a', 'r')).toEqual({
			markdown: '# Changelog\n\n## 1.0.0\n\n- First',
			url: 'https://github.com/a/r/blob/HEAD/CHANGELOG.md'
		});
	});

	it('falls back to GitHub Releases, linking to the releases page', async () => {
		stubFetch((url) =>
			url.includes('api.github.com/repos/b/r/releases') ? json([release('- Notes')]) : json({}, 404)
		);
		expect(await getChangelog('b', 'r')).toEqual({
			markdown: '## v1 · Oct 9, 2026\n\n- Notes',
			url: 'https://github.com/b/r/releases'
		});
	});

	it('returns null when there is neither a file nor releases with notes', async () => {
		stubFetch((url) => (url.includes('/releases') ? json([release('')]) : json({}, 404)));
		expect(await getChangelog('c', 'r')).toBeNull();
	});

	it('throws on a GitHub failure instead of caching "no changelog"', async () => {
		const failing = stubFetch(
			() =>
				new Response(JSON.stringify({ message: 'API rate limit exceeded' }), {
					status: 403,
					headers: { 'x-ratelimit-remaining': '0' }
				})
		);
		await expect(getChangelog('d', 'r')).rejects.toThrow(/GitHub 403/);
		expect(failing).toHaveBeenCalledTimes(1);
		// Not cached: the next call asks GitHub again
		const working = stubFetch((url) => (url.includes('/releases') ? json([]) : json({}, 404)));
		await expect(getChangelog('d', 'r')).resolves.toBeNull();
		expect(working).toHaveBeenCalled();
	});
});

// Pages that need GitHub fail with 503 on a GitHub error, so the error must be one that clears:
// a repo GitHub refuses for good would otherwise be a 503 forever
describe('getReadme', () => {
	it.each([
		[410, {}],
		[451, {}],
		[403, {}] // "Repository access blocked": no rate-limit headers
	])('reads a permanent %i as no README', async (status, headers) => {
		stubFetch(() => new Response('{}', { status, headers }));
		await expect(getReadme(`gone-${status}`, 'r')).resolves.toBeNull();
	});

	it.each([
		[403, { 'x-ratelimit-remaining': '0' }],
		[403, { 'retry-after': '60' }],
		[429, {}],
		[502, {}]
	])('throws on a %i that will clear', async (status, headers) => {
		stubFetch(() => new Response('{}', { status, headers: headers as Record<string, string> }));
		await expect(getReadme(`busy-${status}-${Object.keys(headers)[0]}`, 'r')).rejects.toThrow(
			new RegExp(`GitHub ${status}`)
		);
	});
});
