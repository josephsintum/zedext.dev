import { describe, expect, it } from 'vitest';
import { highlight, isApplePlatform, isTypingTarget, kindLabel, searchHref } from './palette.js';

describe('kindLabel', () => {
	it.each([
		[['themes'], 'Theme'],
		[['icon-themes'], 'Icon theme'],
		[['context-servers'], 'MCP server'],
		[['snippets'], 'Snippets'],
		// The language beats its server and debugger (Java provides all three)
		[['languages', 'grammars', 'language-servers', 'debug-adapters'], 'Language'],
		[['language-servers', 'debug-adapters'], 'Language server'],
		// Grammars never show, and nothing known means no label
		[['grammars'], null],
		[[], null]
	])('%j is %s', (provides, label) => {
		expect(kindLabel(provides)).toBe(label);
	});
});

describe('highlight', () => {
	it('splits the name around the first case-insensitive match', () => {
		expect(highlight('Python LSP', 'python')).toEqual(['', 'Python', ' LSP']);
		expect(highlight('BasedPyright', 'pyr')).toEqual(['Based', 'Pyr', 'ight']);
	});
	it('returns null when the match came from somewhere other than the name', () => {
		expect(highlight('Ruff', 'python')).toBeNull();
		expect(highlight('Ruff', '')).toBeNull();
	});
});

it('searchHref encodes queries for the full results page', () => {
	expect(searchHref('python')).toBe('/extensions?q=python');
	expect(searchHref('c# & "f?"')).toBe('/extensions?q=c%23%20%26%20%22f%3F%22');
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
		for (const t of [el('INPUT'), el('TEXTAREA'), el('SELECT'), el('DIV', true)])
			expect(isTypingTarget(t)).toBe(true);
	});
	it('is false elsewhere', () => {
		for (const t of [el('BODY'), el('A'), null, {} as EventTarget])
			expect(isTypingTarget(t)).toBe(false);
	});
});
