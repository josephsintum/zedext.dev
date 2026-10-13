import { describe, expect, it } from 'vitest';
import { newestExtensions } from './new-extensions.js';
import type { ExtensionRecord, Snapshot } from './types.js';

const rec = (id: string, first: string | null, downloads = 0) =>
	({ id, first_published_at: first, download_count: downloads }) as ExtensionRecord;
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
