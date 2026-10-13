import { describe, expect, it, vi } from 'vitest';
import type { ExtensionRecord } from '$lib/types.js';

const records = new Map<string, Partial<ExtensionRecord>>([
	['has-file', { id: 'has-file', repository: 'https://github.com/o/has-file', changelog: 'file' }],
	['none', { id: 'none', repository: 'https://github.com/o/none', changelog: null }],
	['flaky', { id: 'flaky', repository: 'https://github.com/o/flaky', changelog: 'releases' }]
]);
vi.mock('$lib/server/snapshot.js', () => ({
	requireSnapshot: async () => ({ index: { byId: records }, degraded: false })
}));
vi.mock('$lib/server/github-api.js', () => ({
	getChangelog: async (_owner: string, repo: string) => {
		if (repo === 'flaky') throw new Error('GitHub 403');
		return {
			markdown: '## 1.0.0\n\n- First',
			url: `https://github.com/o/${repo}/blob/HEAD/CHANGELOG.md`
		};
	}
}));
vi.mock('$lib/server/markdown.js', () => ({
	renderMarkdown: async (md: string) => `<p>${md}</p>`
}));
const { GET } = await import('./+server.js');

const call = (id: string) => GET({ params: { id } } as unknown as Parameters<typeof GET>[0]);

describe('/extensions/<id>/changelog', () => {
	it('returns the rendered changelog and its GitHub link, cached for a day', async () => {
		const res = await call('has-file');
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({
			html: '<p>## 1.0.0\n\n- First</p>',
			url: 'https://github.com/o/has-file/blob/HEAD/CHANGELOG.md'
		});
		expect(res.headers.get('cache-control')).toContain('s-maxage=86400');
	});

	it('is a 404 for extensions without one', async () => {
		expect((await call('none')).status).toBe(404);
		expect((await call('unknown')).status).toBe(404);
	});

	it('is a briefly cached 503 when GitHub fails', async () => {
		const res = await call('flaky');
		expect(res.status).toBe(503);
		expect(res.headers.get('cache-control')).toContain('s-maxage=60');
	});
});
