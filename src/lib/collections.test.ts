import { describe, expect, it } from 'vitest';
import { COLLECTIONS, getCollection, resolveCollection } from './collections.js';
import type { ExtensionRecord } from './types.js';

const rec = (id: string) => ({ id, name: id }) as ExtensionRecord;

describe('collections', () => {
	it('have unique slugs and at least 4 extensions each', () => {
		expect(new Set(COLLECTIONS.map((c) => c.slug)).size).toBe(COLLECTIONS.length);
		for (const c of COLLECTIONS) expect(c.ids.length).toBeGreaterThanOrEqual(4);
	});

	it('resolve in order and silently skip extensions missing from the snapshot', () => {
		const c = getCollection('mcp-servers')!;
		const byId = new Map(['mcp-server-github', 'mcp-server-context7'].map((id) => [id, rec(id)]));
		expect(resolveCollection(c, byId).map((r) => r.id)).toEqual([
			'mcp-server-context7',
			'mcp-server-github'
		]);
		expect(resolveCollection(c, new Map())).toEqual([]);
	});
});
