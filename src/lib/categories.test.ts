import { describe, expect, it } from 'vitest';
import {
	CATEGORY_PAGES,
	categoryHref,
	categoryPageForProvides,
	categoryPageForSlug,
	legacyCategoryRedirect
} from './categories.js';
import { match } from '../params/category.js';

describe('category pages', () => {
	it('maps clean slugs to provides kinds', () => {
		expect(categoryPageForSlug('mcp-servers')?.provides).toBe('context-servers');
		expect(categoryPageForSlug('themes')?.provides).toBe('themes');
		expect(categoryPageForProvides('context-servers')?.slug).toBe('mcp-servers');
		expect(CATEGORY_PAGES.map((c) => c.slug)).toEqual([
			'themes',
			'icon-themes',
			'language-servers',
			'mcp-servers',
			'agent-servers',
			'debug-adapters',
			'snippets'
		]);
	});

	it('builds hrefs, with special cases for all and languages', () => {
		expect(categoryHref('all')).toBe('/');
		expect(categoryHref('languages')).toBe('/languages');
		expect(categoryHref('context-servers')).toBe('/mcp-servers');
		expect(categoryHref('nonsense')).toBe('/');
	});

	it('matches only category slugs, never other top-level routes', () => {
		expect(match('themes')).toBe(true);
		for (const other of [
			'about',
			'languages',
			'collections',
			'authors',
			'extensions',
			'sitemap.xml',
			'context-servers'
		]) {
			expect(match(other)).toBe(false);
		}
	});
});

describe('legacyCategoryRedirect', () => {
	const at = (path: string) => legacyCategoryRedirect(new URL(`https://zedext.dev${path}`));

	it('redirects old category links, keeping search and sort', () => {
		expect(at('/?category=context-servers&q=git&sort=stars')).toBe('/mcp-servers?q=git&sort=stars');
		expect(at('/?category=themes')).toBe('/themes');
		expect(at('/?category=languages&q=py')).toBe('/languages?q=py');
		expect(at('/?category=all&q=x&page=2')).toBe('/?q=x');
	});

	it('leaves other URLs alone', () => {
		expect(at('/?q=git')).toBeNull();
		expect(at('/?category=bogus')).toBeNull();
		expect(at('/themes?category=snippets')).toBeNull();
	});
});
