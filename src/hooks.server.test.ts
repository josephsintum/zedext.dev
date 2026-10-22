import { describe, expect, it, vi } from 'vitest';
import type { RequestEvent, ResolveOptions } from '@sveltejs/kit';
import type { ExtensionRecord } from '$lib/types.js';

// The homepage and 404s negotiate between HTML and Markdown; everything else is left alone
const record = {
	id: 'html',
	name: 'HTML',
	description: 'HTML support.',
	authors: ['Isaac'],
	provides: ['languages'],
	download_count: 7_500_000,
	github_stars: 0,
	version: '0.3.2'
} as unknown as ExtensionRecord;

vi.mock('$lib/server/snapshot.js', () => ({
	requireSnapshot: async () => ({ snapshot: { extensions: [record] }, degraded: false })
}));
vi.mock('$lib/server/previews.js', () => ({ getPreviews: async () => ({ themes: {} }) }));

const { handle } = await import('./hooks.server.js');

function call(
	path: string,
	accept: string | null,
	{
		routeId = path === '/' ? '/' : null,
		status = routeId === null ? 404 : 200,
		method = 'GET',
		isDataRequest = false
	}: { routeId?: string | null; status?: number; method?: string; isDataRequest?: boolean } = {}
) {
	const headers = new Headers(accept === null ? {} : { accept });
	const event = {
		request: new Request(`https://zedext.dev${path}`, { method, headers }),
		url: new URL(`https://zedext.dev${path}`),
		route: { id: routeId },
		isDataRequest
	} as unknown as RequestEvent;
	const resolve = vi.fn(
		async (_event: RequestEvent, _opts?: ResolveOptions) =>
			new Response('<!doctype html><h1>page</h1>', {
				status,
				headers: { 'content-type': 'text/html', 'cache-control': 'public, max-age=0' }
			})
	);
	return { response: handle({ event, resolve }), resolve };
}

describe('homepage', () => {
	it('serves Markdown with Vary: Accept to agents that ask for it', async () => {
		const { response, resolve } = call('/', 'text/markdown');
		const res = await response;
		expect(res.status).toBe(200);
		expect(res.headers.get('content-type')).toBe('text/markdown; charset=utf-8');
		expect(res.headers.get('vary')).toBe('Accept');
		expect(res.headers.get('cache-control')).toContain('s-maxage');
		const body = await res.text();
		expect(body).toMatch(/^# ZedExt/);
		expect(body).toContain('[HTML](https://zedext.dev/extensions/html)');
		expect(resolve).not.toHaveBeenCalled();
	});

	it('serves the HTML page with Vary: Accept to browsers and plain clients', async () => {
		for (const accept of ['text/html,application/xhtml+xml,*/*;q=0.8', '*/*', null]) {
			const res = await call('/', accept).response;
			expect(res.headers.get('content-type')).toBe('text/html');
			expect(res.headers.get('vary')).toBe('Accept');
		}
	});

	it('answers 406 when neither HTML nor Markdown is acceptable', async () => {
		const res = await call('/', 'application/json').response;
		expect(res.status).toBe(406);
		expect(res.headers.get('vary')).toBe('Accept');
		expect(await res.text()).toContain('text/html, text/markdown');
	});

	it('leaves old homepage links to their redirect', async () => {
		const { response, resolve } = call('/?q=vim', 'text/markdown');
		await response;
		expect(resolve).toHaveBeenCalled();
	});

	it('leaves client-side navigation data requests alone', async () => {
		const { response, resolve } = call('/', 'text/markdown', { isDataRequest: true });
		const res = await response;
		expect(resolve).toHaveBeenCalled();
		expect(res.headers.get('vary')).toBeNull();
	});
});

describe('404s', () => {
	it('explain themselves in Markdown when asked', async () => {
		const res = await call('/no-such-page', 'text/markdown').response;
		expect(res.status).toBe(404);
		expect(res.headers.get('content-type')).toBe('text/markdown; charset=utf-8');
		expect(res.headers.get('vary')).toBe('Accept');
		const body = await res.text();
		expect(body).toContain('/no-such-page');
		expect(body).toContain('https://zedext.dev/llms.txt');
		expect(body).toContain('https://zedext.dev/sitemap.xml');
	});

	it('stay HTML for browsers', async () => {
		const res = await call('/no-such-page', 'text/html').response;
		expect(res.status).toBe(404);
		expect(res.headers.get('content-type')).toBe('text/html');
		expect(res.headers.get('vary')).toBe('Accept');
	});

	it('stay HTML on ISR routes, which cache one copy whatever the Accept header', async () => {
		const res = await call('/extensions/gone', 'text/markdown', { routeId: '/extensions/[id]' })
			.response;
		expect(res.headers.get('content-type')).toBe('text/html');
	});
});

it('leaves other pages alone', async () => {
	const res = await call('/themes', 'text/markdown', { routeId: '/themes' }).response;
	expect(res.headers.get('content-type')).toBe('text/html');
	expect(res.headers.get('vary')).toBeNull();
});
