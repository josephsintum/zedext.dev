import type { SearchIndex } from './engine.js';
import type { ExtensionRecord } from '$lib/types.js';
import { LANGUAGE_HUBS } from '$lib/languages.js';
import { matchesHub } from '$lib/language-hub.js';

/** Alternatives pages for extensions below this are noindex and left out of the sitemap. */
export const ALTERNATIVES_MIN_DOWNLOADS = 10_000;

const IGNORED_KINDS = new Set(['grammars', 'slash-commands', 'indexed-docs-providers']);
const STOPWORDS = new Set([
	'the',
	'and',
	'for',
	'with',
	'zed',
	'extension',
	'support',
	'from',
	'that',
	'this',
	'your',
	'based',
	'port',
	'theme',
	'themes',
	'editor',
	'adds'
]);

function kinds(r: ExtensionRecord): string[] {
	return r.provides.filter((k) => !IGNORED_KINDS.has(k));
}

/**
 * Extensions of the same kind as `id`: first those for the same language (by language hub),
 * then those sharing words with its name and description, then (when that's not enough,
 * e.g. themes) the most popular of that kind. Language comes first because shared rare
 * words ("formatter", "checker") otherwise outrank it.
 */
export function findSimilar(index: SearchIndex, id: string, limit = 6): ExtensionRecord[] {
	const record = index.byId.get(id);
	if (!record) return [];

	const ownKinds = kinds(record);
	const sameKind = (r: ExtensionRecord) =>
		r.id !== id &&
		(ownKinds.length === 0 ? kinds(r).length === 0 : kinds(r).some((k) => ownKinds.includes(k)));

	const results: ExtensionRecord[] = [];
	const add = (r: ExtensionRecord) => {
		if (results.length < limit && sameKind(r) && !results.includes(r)) results.push(r);
	};

	const hubs = LANGUAGE_HUBS.filter((h) => matchesHub(h, record));
	if (hubs.length > 0) {
		for (const r of index.byDownloads) if (hubs.some((h) => matchesHub(h, r))) add(r);
	}

	const words = `${record.name} ${record.description ?? ''}`
		.toLowerCase()
		.split(/[^a-z0-9+]+/)
		.filter((w) => w.length > 2 && !STOPWORDS.has(w));
	if (words.length > 0) {
		const hits = index.mini.search(words.join(' '), {
			combineWith: 'OR',
			prefix: false,
			fuzzy: false
		});
		for (const hit of hits) add(index.byId.get(hit.id as string)!);
	}
	for (const r of index.byDownloads) add(r);

	return results;
}
