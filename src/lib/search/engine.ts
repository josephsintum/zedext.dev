import MiniSearch from 'minisearch';
import type { ExtensionRecord, SearchResults } from '$lib/types.js';
import { PER_PAGE } from './paging.js';

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

/** Allow 2 edits from 6 chars so a swap like "pyhton" still finds "python". */
function maxEdits(term: string): number | false {
	return term.length < 4 ? false : term.length < 6 ? 1 : 2;
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
			fuzzy: maxEdits,
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
			// Judge each query word by its best match, so a fuzzy near-miss elsewhere in the
			// document ("these" for "theme") can't drag down a clean name match
			const words = result.queryTerms.map((qt) => bestMatch(qt, result.match));
			const inName = words.every((w) => w.inName);
			const typo = words.some((w) => w.typo);
			// 0 exact name · 1 name · 2 description · +2 when a word only matched with a typo
			const tier = exact ? 0 : (inName ? 1 : 2) + (typo ? 2 : 0);
			return { record, tier };
		})
		.sort((a, b) => a.tier - b.tier || b.record.download_count - a.record.download_count)
		.map((m) => m.record);
}

function bestMatch(
	queryTerm: string,
	match: Record<string, string[]>
): { inName: boolean; typo: boolean } {
	const isName = (fields: string[]) => fields.includes('name') || fields.includes('id');
	const entries = Object.entries(match);

	// Exact or prefix matches beat fuzzy ones
	const clean = entries.filter(([term]) => term.startsWith(queryTerm));
	if (clean.length > 0) return { inName: clean.some(([, f]) => isName(f)), typo: false };

	const edits = maxEdits(queryTerm) || 0;
	const fuzzy = entries.filter(([term]) => editDistance(term, queryTerm) <= edits);
	return { inName: fuzzy.some(([, f]) => isName(f)), typo: true };
}

/** Levenshtein distance; terms are short, so the plain DP is fine. */
function editDistance(a: string, b: string): number {
	let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
	for (let i = 1; i <= a.length; i++) {
		const row = [i];
		for (let j = 1; j <= b.length; j++) {
			row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
		}
		prev = row;
	}
	return prev[b.length];
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
	const { category = 'all', sort = 'downloads', page = 0, hitsPerPage = PER_PAGE } = options;

	const q = query.trim();
	const matches = q ? rankMatches(index, q) : index.byDownloads;

	// Facet counts cover every query match, before the category filter is applied
	const provides: Record<string, number> = {};
	for (const r of matches) {
		for (const p of r.provides) provides[p] = (provides[p] ?? 0) + 1;
	}

	let filtered =
		category === 'all' ? matches : matches.filter((r) => r.provides.includes(category));

	// `sort` comes straight from the URL; only accept our own keys (not "__proto__" etc.)
	if (Object.hasOwn(sorters, sort)) filtered = [...filtered].sort(sorters[sort]);

	const start = page * hitsPerPage;
	return {
		hits: filtered.slice(start, start + hitsPerPage),
		nbHits: filtered.length,
		nbPages: Math.ceil(filtered.length / hitsPerPage),
		page,
		facets: { provides }
	};
}
