import { liteClient } from 'algoliasearch/lite';
import { PUBLIC_ALGOLIA_APP_ID, PUBLIC_ALGOLIA_SEARCH_KEY } from '$env/static/public';
import type { SearchResults, ExtensionHit } from '$lib/types.js';

const client = liteClient(PUBLIC_ALGOLIA_APP_ID, PUBLIC_ALGOLIA_SEARCH_KEY);

function sortHits(hits: ExtensionHit[], sort: string): ExtensionHit[] {
	const sorted = [...hits];
	switch (sort) {
		case 'updated':
			return sorted.sort(
				(a, b) =>
					new Date(b.github_pushed_at ?? b.published_at).getTime() -
					new Date(a.github_pushed_at ?? a.published_at).getTime()
			);
		case 'stars':
			return sorted.sort((a, b) => (b.github_stars ?? 0) - (a.github_stars ?? 0));
		case 'name':
			return sorted.sort((a, b) => a.name.localeCompare(b.name));
		case 'downloads':
		default:
			return sorted; // Algolia's default ranking already sorts by downloads
	}
}

export async function searchExtensions(
	query: string,
	options: {
		category?: string;
		sort?: string;
		page?: number;
		hitsPerPage?: number;
	} = {}
): Promise<SearchResults> {
	const { category = 'all', sort = 'downloads', page = 0, hitsPerPage = 24 } = options;

	try {
		const response = await client.search({
			requests: [
				{
					indexName: 'extensions',
					query,
					facets: ['provides'],
					filters: category !== 'all' ? `provides:${category}` : '',
					hitsPerPage,
					page
				}
			]
		});

		const result = response.results[0];
		if (!('hits' in result)) throw new Error('Unexpected response');

		return {
			hits: sortHits(result.hits as ExtensionHit[], sort),
			nbHits: result.nbHits ?? 0,
			nbPages: result.nbPages ?? 0,
			page: result.page ?? 0,
			facets: (result.facets as Record<string, Record<string, number>>) ?? {}
		};
	} catch (err) {
		console.error('Algolia search failed, falling back to Zed API:', err);
		return searchZedApiFallback(query, category, sort);
	}
}

async function searchZedApiFallback(
	query: string,
	category: string,
	sort: string
): Promise<SearchResults> {
	const params = new URLSearchParams({ max_schema_version: '1' });
	if (query) params.set('filter', query);
	if (category !== 'all') params.set('provides', category);

	const res = await fetch(`https://api.zed.dev/extensions?${params}`);
	if (!res.ok) return { hits: [], nbHits: 0, nbPages: 0, page: 0, facets: {} };

	const data = await res.json();
	const hits: ExtensionHit[] = data.data.map((ext: any) => ({
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

	return { hits: sortHits(hits, sort), nbHits: hits.length, nbPages: 1, page: 0, facets: {} };
}
