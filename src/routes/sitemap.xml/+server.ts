import type { RequestHandler } from './$types';
import { getSnapshot } from '$lib/server/snapshot.js';

const SITE = 'https://zedext.dev';

export const GET: RequestHandler = async ({ setHeaders }) => {
	setHeaders({
		'content-type': 'application/xml',
		'cache-control': 'public, s-maxage=3600, stale-while-revalidate=86400'
	});

	const { snapshot } = await getSnapshot();

	const today = new Date().toISOString().split('T')[0];

	const urls = [
		{ loc: SITE, changefreq: 'daily', priority: '1.0', lastmod: today },
		{ loc: `${SITE}/about`, changefreq: 'monthly', priority: '0.3' },
		...snapshot.extensions.map((ext) => ({
			loc: `${SITE}/extensions/${ext.id}`,
			changefreq: 'weekly' as const,
			priority: '0.8',
			lastmod: ext.published_at ? ext.published_at.split('T')[0] : undefined
		}))
	];

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
	.map(
		(u) => `  <url>
    <loc>${escapeXml(u.loc)}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ''}
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
	)
	.join('\n')}
</urlset>`;

	return new Response(xml);
};

function escapeXml(s: string): string {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
