import type { RequestHandler } from './$types';
import { requireSnapshot } from '$lib/server/snapshot.js';
import { CATEGORY_PAGES } from '$lib/categories.js';
import { LANGUAGE_HUBS } from '$lib/languages.js';
import { DISCOVER_LISTS } from '$lib/discover.js';

const SITE = 'https://zedext.dev';

export const GET: RequestHandler = async ({ setHeaders }) => {
	const { snapshot, degraded } = await requireSnapshot();

	// The fallback snapshot lists at most 1,000 extensions; don't let crawlers cache that for long
	setHeaders({
		'content-type': 'application/xml',
		'cache-control': degraded
			? 'public, s-maxage=300'
			: 'public, s-maxage=3600, stale-while-revalidate=86400'
	});

	const today = new Date().toISOString().split('T')[0];

	const urls = [
		{ loc: SITE, changefreq: 'daily', priority: '1.0', lastmod: today },
		{ loc: `${SITE}/about`, changefreq: 'monthly', priority: '0.3' },
		...CATEGORY_PAGES.map((c) => ({
			loc: `${SITE}/${c.slug}`,
			changefreq: 'daily',
			priority: '0.9',
			lastmod: today
		})),
		{ loc: `${SITE}/languages`, changefreq: 'weekly', priority: '0.9', lastmod: today },
		...LANGUAGE_HUBS.map((h) => ({
			loc: `${SITE}/languages/${h.slug}`,
			changefreq: 'weekly',
			priority: '0.9',
			lastmod: today
		})),
		{ loc: `${SITE}/discover`, changefreq: 'weekly', priority: '0.7' },
		{ loc: `${SITE}/discover/themes`, changefreq: 'weekly', priority: '0.7' },
		...DISCOVER_LISTS.map((c) => ({
			loc: `${SITE}/discover/${c.slug}`,
			changefreq: 'weekly',
			priority: '0.7'
		})),
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
