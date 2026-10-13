import { describe, expect, it } from 'vitest';
import { newThisWeek } from './new-extensions.js';
import type { ExtensionRecord, Snapshot } from './types.js';

const rec = (id: string, first: string | null, downloads = 0) =>
	({ id, first_published_at: first, download_count: downloads }) as ExtensionRecord;
const snapshot = (extensions: ExtensionRecord[]): Snapshot => ({
	generatedAt: '2026-10-13T07:00:00.000Z',
	extensions
});

describe('newThisWeek', () => {
	it('lists extensions first released in the 7 days before the sync, newest first', () => {
		const s = snapshot([
			rec('old', '2026-10-06T06:59:00Z'),
			rec('edge', '2026-10-06T07:00:00Z'),
			rec('newest', '2026-10-12T10:00:00Z'),
			rec('unknown', null)
		]);
		expect(newThisWeek(s).map((r) => r.id)).toEqual(['newest', 'edge']);
	});

	it('breaks same-day ties by downloads and caps the row', () => {
		const s = snapshot(
			['a', 'b', 'c', 'd', 'e'].map((id, i) => rec(id, '2026-10-09T20:00:00Z', i))
		);
		expect(newThisWeek(s, 4).map((r) => r.id)).toEqual(['e', 'd', 'c', 'b']);
	});
});
