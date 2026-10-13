import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('$env/dynamic/private', () => ({ env: {} }));
const { getChangelog } = await import('./github-api.js');

type Route = (url: string) => Response;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
function stubFetch(route: Route) {
	const fn = vi.fn(async (input: string | URL | Request) => route(String(input)));
	vi.stubGlobal('fetch', fn);
	return fn;
}
afterEach(() => vi.unstubAllGlobals());

const file = (owner: string, name: string) => ({
	name,
	type: 'file',
	download_url: `https://raw.test/${owner}/${name}`,
	html_url: `https://github.com/${owner}/r/blob/main/${name}`
});
const release = (body: string) => ({
	tag_name: 'v1',
	name: null,
	body,
	published_at: '2026-10-09T12:00:00Z',
	draft: false
});

// Each test uses its own owner: results are cached in memory per repo
describe('getChangelog', () => {
	it("uses the repo's changelog file, linking to it on GitHub", async () => {
		stubFetch((url) =>
			url.endsWith('/repos/a/r/contents/')
				? json([file('a', 'README.md'), file('a', 'CHANGELOG.md')])
				: url === 'https://raw.test/a/CHANGELOG.md'
					? new Response('# Changelog\n\n## 1.0.0\n\n- First')
					: json({}, 404)
		);
		expect(await getChangelog('a', 'r')).toEqual({
			markdown: '# Changelog\n\n## 1.0.0\n\n- First',
			url: 'https://github.com/a/r/blob/main/CHANGELOG.md'
		});
	});

	it('falls back to GitHub Releases, linking to the releases page', async () => {
		stubFetch((url) =>
			url.endsWith('/repos/b/r/contents/')
				? json([file('b', 'README.md')])
				: url.includes('/repos/b/r/releases')
					? json([release('- Notes')])
					: json({}, 404)
		);
		expect(await getChangelog('b', 'r')).toEqual({
			markdown: '## v1 · Oct 9, 2026\n\n- Notes',
			url: 'https://github.com/b/r/releases'
		});
	});

	it('returns null when there is neither a file nor releases with notes', async () => {
		stubFetch((url) =>
			url.endsWith('/repos/c/r/contents/')
				? json([file('c', 'README.md')])
				: url.includes('/releases')
					? json([release('')])
					: json({}, 404)
		);
		expect(await getChangelog('c', 'r')).toBeNull();
	});

	it('throws on a GitHub failure instead of caching "no changelog"', async () => {
		const failing = stubFetch(() => json({ message: 'rate limited' }, 403));
		await expect(getChangelog('d', 'r')).rejects.toThrow(/GitHub 403/);
		expect(failing).toHaveBeenCalledTimes(1);
		// Not cached: the next call asks GitHub again
		const working = stubFetch((url) => (url.endsWith('/contents/') ? json([]) : json([])));
		await expect(getChangelog('d', 'r')).resolves.toBeNull();
		expect(working).toHaveBeenCalled();
	});
});
