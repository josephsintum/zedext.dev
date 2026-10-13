import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getPreviews } from '$lib/server/previews.js';
import { iconStripSvg } from '$lib/server/icon-strip.js';

/** The icon strip on icon-theme cards: folder plus the first file icons of the first variant. */
export const GET: RequestHandler = async ({ params, url }) => {
	const entry = (await getPreviews())?.icons[params.id];
	const variant = entry?.variants[0];
	const svgs = variant
		? [variant.folder, ...variant.files.map((f) => f.svg)]
				.filter((s): s is string => !!s)
				.slice(0, 5)
		: [];
	if (!entry || svgs.length === 0) throw error(404, 'No icon preview');

	// ?v=<version> names one version forever; anything else is cached briefly
	const exact = url.searchParams.get('v') === entry.version;
	return new Response(iconStripSvg(svgs), {
		headers: {
			'content-type': 'image/svg+xml',
			'cache-control': exact
				? 'public, max-age=31536000, immutable'
				: 'public, max-age=300, s-maxage=300',
			// Opened directly, this document still can't load or run anything
			'content-security-policy': "default-src 'none'; img-src data:; style-src 'unsafe-inline'"
		}
	});
};
