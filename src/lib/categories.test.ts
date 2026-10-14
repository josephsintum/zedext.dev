import { describe, expect, it } from 'vitest';
import {
	CATEGORY_PAGES,
	categoryForPath,
	categoryHref,
	categoryPageForProvides,
	categoryPageForSlug,
	legacyHomeRedirect
} from './categories.js';
import { match } from '../params/category.js';

describe('category pages', () => {
	it('maps clean slugs to provides kinds', () => {
		expect(categoryPageForSlug('mcp-servers')?.provides).toBe('context-servers');
		expect(categoryPageForSlug('themes')).toBeUndefined();
		expect(categoryPageForProvides('context-servers')?.slug).toBe('mcp-servers');
		expect(CATEGORY_PAGES.map((c) => c.slug)).toEqual([
			'icon-themes',
			'language-servers',
			'mcp-servers',
			'agent-servers',
			'debug-adapters',
			'snippets'
		]);
	});

	it('builds hrefs, with special cases for all, languages and themes', () => {
		expect(categoryHref('all')).toBe('/extensions');
		expect(categoryHref('languages')).toBe('/languages');
		expect(categoryHref('themes')).toBe('/themes');
		expect(categoryHref('context-servers')).toBe('/mcp-servers');
		expect(categoryHref('nonsense')).toBe('/extensions');
	});

	it('matches only category slugs, never other top-level routes', () => {
		expect(match('mcp-servers')).toBe(true);
		for (const other of [
			'about',
			'themes',
			'guides',
			'languages',
			'discover',
			'authors',
			'extensions',
			'sitemap.xml',
			'context-servers'
		]) {
			expect(match(other)).toBe(false);
		}
	});
});

describe('legacyHomeRedirect', () => {
	const at = (path: string) => legacyHomeRedirect(new URL(`https://zedext.dev${path}`));

	it('redirects old category links, keeping search and sort', () => {
		expect(at('/?category=context-servers&q=git&sort=stars')).toBe('/mcp-servers?q=git&sort=stars');
		expect(at('/?category=themes')).toBe('/themes');
		expect(at('/?category=languages&q=py')).toBe('/languages?q=py');
		expect(at('/?category=all&q=x&page=2')).toBe('/extensions?q=x');
	});

	it('sends searches, sorts and pages to the full list', () => {
		expect(at('/?q=git')).toBe('/extensions?q=git');
		expect(at('/?sort=stars&page=2')).toBe('/extensions?sort=stars&page=2');
	});

	it('leaves other URLs alone', () => {
		expect(at('/')).toBeNull();
		expect(at('/?utm_source=x')).toBeNull();
		expect(at('/?category=bogus')).toBeNull();
		expect(at('/themes?category=snippets')).toBeNull();
	});
});

describe('categoryForPath', () => {
	it('finds the browse tab a path shows', () => {
		expect(categoryForPath('/extensions')).toBe('all');
		expect(categoryForPath('/themes')).toBe('themes');
		expect(categoryForPath('/mcp-servers')).toBe('context-servers');
		expect(categoryForPath('/languages')).toBe('languages');
	});

	it('ignores pages that are not browse pages', () => {
		expect(categoryForPath('/extensions/html')).toBeUndefined();
		expect(categoryForPath('/')).toBeUndefined();
		expect(categoryForPath('/guides/vim')).toBeUndefined();
	});
});
