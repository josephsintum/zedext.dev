import { describe, expect, it } from 'vitest';
import { clampPage, MAX_SERVER_PAGES } from './paging.js';

describe('clampPage', () => {
	it('reads a page count from ?page=', () => {
		expect(clampPage('3')).toBe(3);
	});

	it('falls back to one page for missing or junk values', () => {
		expect(clampPage(null)).toBe(1);
		expect(clampPage('abc')).toBe(1);
		expect(clampPage('0')).toBe(1);
		expect(clampPage('-4')).toBe(1);
	});

	it('caps only when given a maximum', () => {
		expect(clampPage('9999')).toBe(9999);
		expect(clampPage('9999', MAX_SERVER_PAGES)).toBe(MAX_SERVER_PAGES);
	});
});
