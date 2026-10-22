import { describe, expect, it } from 'vitest';
import { cardData, homeData } from './home.js';
import type { ExtensionRecord } from '$lib/types.js';

const full: ExtensionRecord = {
	id: 'codebook',
	name: 'Codebook',
	description: 'Spell checker',
	authors: ['Bo'],
	provides: ['language-servers'],
	download_count: 162_337,
	github_stars: 915,
	github_license: 'MIT',
	github_pushed_at: '2026-09-30T03:10:01Z',
	published_at: '2026-07-05T14:42:31Z',
	first_published_at: '2025-01-22T19:14:44Z',
	version: '0.2.14',
	repository: 'https://github.com/blopker/codebook',
	changelog: 'file'
};

describe('cardData', () => {
	it('keeps only what a card draws', () => {
		expect(cardData(full)).toEqual({
			id: 'codebook',
			name: 'Codebook',
			description: 'Spell checker',
			authors: ['Bo'],
			provides: ['language-servers'],
			download_count: 162_337,
			github_stars: 915,
			version: '0.2.14'
		});
	});
});

describe('homeData', () => {
	it('ships card fields only, in every row', () => {
		const data = homeData([full], null);
		expect(data.extensionCount).toBe(1);
		expect(data.popular).toEqual([cardData(full)]);
		for (const g of data.guides) {
			for (const item of g.items)
				expect(Object.keys(item)).toEqual(['id', 'name', 'download_count']);
			expect(g.list).not.toHaveProperty('match');
		}
	});
});
