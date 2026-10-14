import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { discoverRedirect } from '$lib/guides.js';

/** Discover moved: the page is now the homepage, the picker /themes, the guides /guides/<slug>. */
export const GET: RequestHandler = ({ params, url }) => {
	const target = discoverRedirect(params.path, url.search);
	if (!target) throw error(404, 'Not found');
	throw redirect(301, target);
};
