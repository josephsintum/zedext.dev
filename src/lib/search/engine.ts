import MiniSearch from 'minisearch';
import type { ExtensionRecord, SearchResults } from '$lib/types.js';

/**
 * Search over the extension snapshot. Pure and shared by the server (SSR) and
 * the browser, so both always return the same results for the same URL.
 */

export interface SearchIndex {
	mini: MiniSearch<ExtensionRecord>;
	byId: Map<string, ExtensionRecord>;
	/** All records, most downloaded first — the order for an empty query. */
	byDownloads: ExtensionRecord[];
}

export interface SearchOptions {
	category?: string;
	sort?: string;
	page?: number;
	hitsPerPage?: number;
}

export function createIndex(records: ExtensionRecord[]): SearchIndex {
	const byId = new Map(records.map((r) => [r.id, r]));

	const mini = new MiniSearch<ExtensionRecord>({
		fields: ['name', 'id', 'description', 'authors'],
		storeFields: [],
		extractField: (doc, field) => {
			const value = doc[field as keyof ExtensionRecord];
			return Array.isArray(value) ? value.join(' ') : ((value as string | null) ?? '');
		},
		searchOptions: {
			boost: { name: 3, id: 2 },
			prefix: true,
			// Allow 2 edits from 6 chars so a swap like "pyhton" still finds "python"
			fuzzy: (term) => (term.length < 4 ? false : term.length < 6 ? 1 : 2),
			combineWith: 'AND'
		}
	});
	mini.addAll(records);

	const byDownloads = [...records].sort((a, b) => b.download_count - a.download_count);

	return { mini, byId, byDownloads };
}

/**
 * Rank like Algolia did: by match quality tier (typos, then field), then by downloads.
 * BM25 alone over-rewards short names ("Rust Snippets" above popular extensions).
 */
function rankMatches(index: SearchIndex, q: string): ExtensionRecord[] {
	const lower = q.toLowerCase();
	return index.mini
		.search(q)
		.map((result) => {
			const record = index.byId.get(result.id as string)!;
			const exact = record.id === lower || record.name.toLowerCase() === lower;
			const inName = Object.values(result.match).every(
				(fields) => fields.includes('name') || fields.includes('id')
			);
			const typo = result.terms.some((t) => !result.queryTerms.some((qt) => t.startsWith(qt)));
			// 0 exact name · 1 name · 2 description · +2 when only a typo matched
			const tier = exact ? 0 : (inName ? 1 : 2) + (typo ? 2 : 0);
			return { record, tier };
		})
		.sort((a, b) => a.tier - b.tier || b.record.download_count - a.record.download_count)
		.map((m) => m.record);
}

const sorters: Record<string, (a: ExtensionRecord, b: ExtensionRecord) => number> = {
	stars: (a, b) => b.github_stars - a.github_stars,
	updated: (a, b) => lastActivity(b) - lastActivity(a),
	name: (a, b) => sortName(a).localeCompare(sortName(b))
};

/** Ignore leading emoji/punctuation so "🌌 Dark Pop UI" sorts under D. */
function sortName(r: ExtensionRecord): string {
	return r.name.replace(/^[^\p{L}\p{N}]+/u, '');
}

function lastActivity(r: ExtensionRecord): number {
	return new Date(r.github_pushed_at ?? r.published_at).getTime();
}

export function searchIndex(
	index: SearchIndex,
	query: string,
	options: SearchOptions = {}
): SearchResults {
	const { category = 'all', sort = 'downloads', page = 0, hitsPerPage = 24 } = options;

	const q = query.trim();
	const matches = q ? rankMatches(index, q) : index.byDownloads;

	// Facet counts cover every query match, before the category filter is applied
	const provides: Record<string, number> = {};
	for (const r of matches) {
		for (const p of r.provides) provides[p] = (provides[p] ?? 0) + 1;
	}

	let filtered =
		category === 'all' ? matches : matches.filter((r) => r.provides.includes(category));

	const sorter = sorters[sort];
	if (sorter) filtered = [...filtered].sort(sorter);

	const start = page * hitsPerPage;
	return {
		hits: filtered.slice(start, start + hitsPerPage),
		nbHits: filtered.length,
		nbPages: Math.ceil(filtered.length / hitsPerPage),
		page,
		facets: { provides }
	};
}
