import { describe, expect, it } from 'vitest';
import { newestExtensions, recentlyUpdated } from './new-extensions.js';
import type { ExtensionRecord, Snapshot } from './types.js';

const rec = (id: string, first: string | null, downloads = 0) =>
	({
		id,
		first_published_at: first,
		download_count: downloads,
		provides: []
	}) as unknown as ExtensionRecord;
const snapshot = (extensions: ExtensionRecord[]): Snapshot => ({
	generatedAt: '2026-10-13T07:00:00.000Z',
	extensions
});

describe('newestExtensions', () => {
	it('lists the most recently first-released extensions, however old, newest first', () => {
		const s = snapshot([
			rec('older', '2025-01-01T00:00:00Z'),
			rec('unknown', null),
			rec('newest', '2026-10-12T10:00:00Z'),
			rec('last-month', '2026-09-01T00:00:00Z')
		]);
		expect(newestExtensions(s).map((r) => r.id)).toEqual(['newest', 'last-month', 'older']);
	});

	it('breaks ties by downloads and caps the row', () => {
		const s = snapshot(
			['a', 'b', 'c', 'd', 'e'].map((id, i) => rec(id, '2026-10-09T20:00:00Z', i))
		);
		expect(newestExtensions(s, 4).map((r) => r.id)).toEqual(['e', 'd', 'c', 'b']);
	});
});

describe('newestExtensions skips themes', () => {
	it('leaves out themes and icon themes, which have their own section', () => {
		const s = snapshot([
			{ ...rec('theme', '2026-10-12T00:00:00Z'), provides: ['themes'] },
			{ ...rec('icons', '2026-10-11T00:00:00Z'), provides: ['icon-themes'] },
			{ ...rec('lang', '2026-10-10T00:00:00Z'), provides: ['languages'] }
		]);
		expect(newestExtensions(s).map((r) => r.id)).toEqual(['lang']);
	});

	it('is empty when no first-release dates exist (degraded snapshot)', () => {
		expect(newestExtensions(snapshot([{ ...rec('a', null), provides: [] }]))).toEqual([]);
	});
});

describe('recentlyUpdated', () => {
	const r = (id: string, published: string, downloads: number) =>
		({
			id,
			published_at: published,
			download_count: downloads,
			provides: []
		}) as unknown as ExtensionRecord;

	it('lists the newest releases of extensions with at least 50k downloads', () => {
		const records = [
			r('small', '2026-10-12T00:00:00Z', 49_999),
			r('older', '2026-10-01T00:00:00Z', 60_000),
			r('newer', '2026-10-10T00:00:00Z', 50_000)
		];
		expect(recentlyUpdated(records, new Set()).map((x) => x.id)).toEqual(['newer', 'older']);
	});

	it('skips extensions already shown in New and caps the row', () => {
		const records = ['a', 'b', 'c', 'd', 'e', 'f'].map((id, i) =>
			r(id, `2026-10-0${i + 1}T00:00:00Z`, 100_000)
		);
		expect(recentlyUpdated(records, new Set(['f'])).map((x) => x.id)).toEqual(['e', 'd', 'c', 'b']);
	});
});
