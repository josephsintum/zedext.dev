import { beforeEach, describe, expect, it, vi } from 'vitest';

// Pages are cached by ISR for a day, and ISR never caches a 5xx: a render missing GitHub data
// must fail so the last good copy is kept, instead of caching the gap
const failing = new Set<string>();
let previews: unknown = { themes: { 'a-theme': { variants: [] } }, icons: {} };

vi.mock('$lib/server/zed-api.js', () => ({
	getExtensionWithVersions: async (id: string) =>
		id === 'missing'
			? null
			: {
					extension: {
						id,
						repository: `https://github.com/o/${id}`,
						provides: id === 'a-theme' ? ['themes'] : ['languages']
					},
					versions: []
				}
}));
vi.mock('$lib/server/github-api.js', () => {
	const maybeFail = (name: string, value: unknown) => async () => {
		if (failing.has(name)) throw new Error('GitHub 403');
		return value;
	};
	return {
		getLanguageDocsMarkdown: maybeFail('docs', null),
		getRepoMetadata: maybeFail('meta', { default_branch: 'main', archived: false }),
		getReadme: maybeFail('readme', { markdown: '# Hi', dir: '' }),
		getGitHubUser: maybeFail('user', { avatar_url: 'https://avatars/x' })
	};
});
vi.mock('$lib/server/markdown.js', () => ({
	renderMarkdown: async (md: string) => `<p>${md}</p>`
}));
vi.mock('$lib/server/snapshot.js', () => ({
	getSnapshot: async () => ({ index: { byId: new Map() } })
}));
vi.mock('$lib/server/previews.js', () => ({ getPreviews: async () => previews }));

const { load } = await import('./+page.server.js');
const call = (id: string) => load({ params: { id } } as unknown as Parameters<typeof load>[0]);

describe('/extensions/<id> load', () => {
	beforeEach(() => {
		failing.clear();
		previews = { themes: { 'a-theme': { variants: [] } }, icons: {} };
	});

	it('renders the README inline when GitHub answers', async () => {
		const data = (await call('ruby')) as { content: { readmeHtml: string | null } };
		expect(data.content.readmeHtml).toBe('<p># Hi</p>');
	});

	it.each(['docs', 'meta', 'readme', 'user'])(
		'fails with 503 when the GitHub %s request fails',
		async (name) => {
			failing.add(name);
			await expect(call('ruby')).rejects.toMatchObject({ status: 503 });
		}
	);

	it("fails with 503 when a theme's preview bundle is unavailable", async () => {
		previews = null;
		await expect(call('a-theme')).rejects.toMatchObject({ status: 503 });
	});

	it('is a 404 for an unknown extension', async () => {
		await expect(call('missing')).rejects.toMatchObject({ status: 404 });
	});
});
