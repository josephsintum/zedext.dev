import { describe, expect, it } from 'vitest';
import { hasKeyword, nameWords } from './words.js';

describe('nameWords', () => {
	it('splits id and name into lowercase words, keeping +', () => {
		expect([...nameWords({ id: 'docker-compose', name: 'Docker Compose C++' })].sort()).toEqual([
			'c++',
			'compose',
			'docker'
		]);
	});
});

describe('hasKeyword', () => {
	it('matches exact words only, so "java" does not match "javascript"', () => {
		const words = nameWords({ id: 'javascript-snippets', name: 'JavaScript Snippets' });
		expect(hasKeyword(words, ['java'])).toBe(false);
		expect(hasKeyword(words, ['javascript'])).toBe(true);
	});
});
