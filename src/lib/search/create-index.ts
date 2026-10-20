import MiniSearch from 'minisearch';
import type { ExtensionRecord } from '$lib/types.js';
import { maxEdits, type SearchIndex } from './engine.js';

/** The search index over the snapshot. The browser imports this on first search intent. */
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
