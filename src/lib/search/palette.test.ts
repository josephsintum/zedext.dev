import { describe, expect, it } from 'vitest';
import {
	extensionHref,
	highlight,
	isApplePlatform,
	isTypingTarget,
	kindLabel,
	searchHref
} from './palette.js';

describe('kindLabel', () => {
	it('names an extension by what people would call it', () => {
		expect(kindLabel(['themes'])).toBe('Theme');
		expect(kindLabel(['icon-themes'])).toBe('Icon theme');
		expect(kindLabel(['context-servers'])).toBe('MCP server');
		expect(kindLabel(['snippets'])).toBe('Snippets');
	});
	it('prefers the language over its server and debugger (Java provides all three)', () => {
		expect(kindLabel(['languages', 'grammars', 'language-servers', 'debug-adapters'])).toBe(
			'Language'
		);
		expect(kindLabel(['language-servers', 'debug-adapters'])).toBe('Language server');
	});
	it('never shows grammars, and has no label for nothing it knows', () => {
		expect(kindLabel(['grammars'])).toBeNull();
		expect(kindLabel([])).toBeNull();
	});
});

describe('highlight', () => {
	it('splits the name around the first case-insensitive match', () => {
		expect(highlight('Python LSP', 'python')).toEqual(['', 'Python', ' LSP']);
		expect(highlight('BasedPyright', 'pyr')).toEqual(['Based', 'Pyr', 'ight']);
	});
	it('ignores surrounding spaces in the query', () => {
		expect(highlight('Git Firefly', '  fire ')).toEqual(['Git ', 'Fire', 'fly']);
	});
	it('returns null when the match came from somewhere other than the name', () => {
		expect(highlight('Ruff', 'python')).toBeNull();
		expect(highlight('Ruff', '   ')).toBeNull();
	});
});

describe('hrefs', () => {
	it('encodes queries for the full results page', () => {
		expect(searchHref('python')).toBe('/extensions?q=python');
		expect(searchHref(' c# & "f?" ')).toBe('/extensions?q=c%23%20%26%20%22f%3F%22');
	});
	it('encodes extension ids', () => {
		expect(extensionHref('git-firefly')).toBe('/extensions/git-firefly');
		expect(extensionHref('a b')).toBe('/extensions/a%20b');
	});
});

describe('isApplePlatform', () => {
	it('is true for Macs, iPhones and iPads', () => {
		for (const p of ['MacIntel', 'macOS', 'iPhone', 'iPad']) expect(isApplePlatform(p)).toBe(true);
	});
	it('is false elsewhere', () => {
		for (const p of ['Win32', 'Windows', 'Linux x86_64', 'Android', ''])
			expect(isApplePlatform(p)).toBe(false);
	});
});

describe('isTypingTarget', () => {
	const el = (tagName: string, isContentEditable = false) =>
		({ tagName, isContentEditable }) as unknown as EventTarget;
	it('is true in text fields and editable content', () => {
		expect(isTypingTarget(el('INPUT'))).toBe(true);
		expect(isTypingTarget(el('TEXTAREA'))).toBe(true);
		expect(isTypingTarget(el('SELECT'))).toBe(true);
		expect(isTypingTarget(el('DIV', true))).toBe(true);
	});
	it('is false elsewhere', () => {
		expect(isTypingTarget(el('BODY'))).toBe(false);
		expect(isTypingTarget(el('A'))).toBe(false);
		expect(isTypingTarget(null)).toBe(false);
		expect(isTypingTarget({} as EventTarget)).toBe(false);
	});
});
