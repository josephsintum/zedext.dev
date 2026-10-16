import { describe, expect, it } from 'vitest';
import { readRecent, recordRecent, RECENT_KEY, RECENT_LIMIT, type RecentStore } from './recent.js';

function memory(initial?: string): RecentStore {
	const data = new Map<string, string>(initial === undefined ? [] : [[RECENT_KEY, initial]]);
	return {
		getItem: (key) => data.get(key) ?? null,
		setItem: (key, value) => void data.set(key, value)
	};
}

const blocked: RecentStore = {
	getItem: () => {
		throw new Error('SecurityError');
	},
	setItem: () => {
		throw new Error('QuotaExceededError');
	}
};

describe('recently viewed', () => {
	it('starts empty', () => {
		expect(readRecent(memory())).toEqual([]);
	});

	it('lists the newest first', () => {
		const store = memory();
		recordRecent('oxc', store);
		recordRecent('java', store);
		expect(readRecent(store)).toEqual(['java', 'oxc']);
	});

	it('moves a revisited extension to the front instead of listing it twice', () => {
		const store = memory();
		for (const id of ['oxc', 'java', 'oxc']) recordRecent(id, store);
		expect(readRecent(store)).toEqual(['oxc', 'java']);
	});

	it(`keeps only the last ${RECENT_LIMIT}`, () => {
		const store = memory();
		for (const id of ['a', 'b', 'c', 'd', 'e', 'f']) recordRecent(id, store);
		expect(readRecent(store)).toEqual(['f', 'e', 'd', 'c', 'b']);
	});

	it('ignores corrupt or foreign data', () => {
		expect(readRecent(memory('{oops'))).toEqual([]);
		expect(readRecent(memory('{"a":1}'))).toEqual([]);
		expect(readRecent(memory('["oxc",3,null]'))).toEqual(['oxc']);
		// Repeats would crash the window's keyed list
		expect(readRecent(memory('["oxc","java","oxc"]'))).toEqual(['oxc', 'java']);
	});

	it('never throws when storage is blocked or missing', () => {
		expect(readRecent(blocked)).toEqual([]);
		expect(() => recordRecent('oxc', blocked)).not.toThrow();
		expect(readRecent(null)).toEqual([]);
		expect(() => recordRecent('oxc', null)).not.toThrow();
	});
});
