import type { PageServerLoad } from './$types';
import type { SearchResults } from '$lib/types.js';

export const load: PageServerLoad = async ({ setHeaders }) => {
	setHeaders({
		'cache-control': 'public, s-maxage=300, stale-while-revalidate=3600'
	});

	// Fetch top extensions from Zed API for SSR/SEO (search engines can't run client-side Algolia)
	try {
		const res = await fetch('https://api.zed.dev/extensions?max_schema_version=1');
		if (!res.ok) throw new Error(`Zed API error: ${res.status}`);
		const data = await res.json();

		const hits = data.data.slice(0, 24).map((ext: any) => ({
			objectID: ext.id,
			name: ext.name,
			description: ext.description,
			authors: ext.authors,
			provides: ext.provides,
			download_count: ext.download_count,
			github_stars: 0,
			github_license: null,
			github_pushed_at: null,
			published_at: ext.published_at,
			published_at_timestamp: Math.floor(new Date(ext.published_at).getTime() / 1000),
			version: ext.version,
			repository: ext.repository
		}));

		const initialResults: SearchResults = {
			hits,
			nbHits: data.data.length,
			nbPages: Math.ceil(data.data.length / 24),
			page: 0,
			facets: {}
		};

		return { initialResults };
	} catch {
		return {
			initialResults: {
				hits: [],
				nbHits: 0,
				nbPages: 0,
				page: 0,
				facets: {}
			} satisfies SearchResults
		};
	}
};
