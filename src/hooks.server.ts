import type { Handle } from '@sveltejs/kit';
import { preferredFormat } from '$lib/server/accept.js';
import { homeMarkdown, notFoundMarkdown } from '$lib/server/agent-markdown.js';
import { pageCacheControl } from '$lib/server/browse.js';
import { homeData } from '$lib/server/home.js';
import { getPreviews } from '$lib/server/previews.js';
import { requireSnapshot } from '$lib/server/snapshot.js';
import { legacyHomeRedirect } from '$lib/categories.js';

const MARKDOWN = 'text/markdown; charset=utf-8';

/** Adds Vary: Accept, so caches keep the HTML and Markdown of a URL apart */
function varyOnAccept(response: Response): Response {
	const vary = response.headers.get('vary');
	if (
		!vary
			?.toLowerCase()
			.split(/\s*,\s*/)
			.includes('accept')
	) {
		response.headers.set('vary', vary ? `${vary}, Accept` : 'Accept');
	}
	return response;
}

/**
 * The homepage and 404s also come as Markdown, for agents that ask with Accept: text/markdown
 * (acceptmarkdown.com). Only routes outside ISR negotiate: ISR caches one copy per URL whatever
 * the Accept header, so an ISR page could end up serving Markdown to browsers.
 */
export const handle: Handle = async ({ event, resolve }) => {
	const { request, url } = event;
	const negotiable =
		(request.method === 'GET' || request.method === 'HEAD') && !event.isDataRequest;
	if (!negotiable) return resolve(event);

	if (url.pathname === '/' && !legacyHomeRedirect(url)) {
		const format = preferredFormat(request.headers.get('accept'));
		if (format === null) {
			return new Response('Not Acceptable. Available: text/html, text/markdown\n', {
				status: 406,
				headers: {
					'content-type': 'text/plain; charset=utf-8',
					'cache-control': 'no-store',
					vary: 'Accept'
				}
			});
		}
		if (format === 'markdown') {
			const [{ snapshot, degraded }, previews] = await Promise.all([
				requireSnapshot(),
				getPreviews()
			]);
			return new Response(homeMarkdown(homeData(snapshot.extensions, previews)), {
				headers: {
					'content-type': MARKDOWN,
					'cache-control': pageCacheControl(degraded || !previews),
					vary: 'Accept'
				}
			});
		}
		return varyOnAccept(await resolve(event));
	}

	const response = await resolve(event);
	// No route matched: not an ISR page, and SvelteKit's 404s aren't cached
	if (response.status === 404 && event.route.id === null) {
		if (preferredFormat(request.headers.get('accept')) === 'markdown') {
			return new Response(notFoundMarkdown(url.pathname), {
				status: 404,
				headers: {
					'content-type': MARKDOWN,
					'cache-control': response.headers.get('cache-control') ?? 'no-cache',
					vary: 'Accept'
				}
			});
		}
		return varyOnAccept(response);
	}
	return response;
};
