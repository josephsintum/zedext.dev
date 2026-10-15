import { describe, expect, it } from 'vitest';
import { featuredExtensions, mostPopular } from './home-rows.js';
import type { ExtensionRecord } from './types.js';

const rec = (id: string, downloads = 0, provides: string[] = []) =>
	({ id, download_count: downloads, provides }) as unknown as ExtensionRecord;

describe('featuredExtensions', () => {
	it('keeps the hand-picked order and skips ids no longer in the registry', () => {
		const records = [rec('a'), rec('b'), rec('c')];
		expect(featuredExtensions(records, ['c', 'gone', 'a']).map((r) => r.id)).toEqual(['c', 'a']);
	});
});

describe('mostPopular', () => {
	it('lists the most downloaded first, themes included, up to the limit', () => {
		const records = [rec('small', 10), rec('theme', 300, ['themes']), rec('big', 200)];
		expect(mostPopular(records, 2).map((r) => r.id)).toEqual(['theme', 'big']);
	});

	it('does not reorder the snapshot it was given', () => {
		const records = [rec('small', 10), rec('big', 200)];
		mostPopular(records);
		expect(records.map((r) => r.id)).toEqual(['small', 'big']);
	});
});
