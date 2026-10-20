import { describe, expect, it } from 'vitest';
import { KINDS, kindOf, primaryKind, shownProvides, tagFor } from './kinds.js';

describe('primaryKind', () => {
	it.each([
		[['themes'], 'Theme'],
		[['icon-themes'], 'Icon theme'],
		[['context-servers'], 'MCP server'],
		[['snippets'], 'Snippets'],
		// The language beats its server and debugger (Java provides all three)
		[['languages', 'grammars', 'language-servers', 'debug-adapters'], 'Language'],
		[['language-servers', 'debug-adapters'], 'Language server'],
		// A language that ships icons is a language (puppet), a server that's also MCP a server (gem)
		[['languages', 'icon-themes', 'grammars', 'language-servers'], 'Language'],
		[['language-servers', 'context-servers', 'snippets'], 'Language server'],
		// Grammars never count, and nothing known means no kind
		[['grammars'], undefined],
		[['slash-commands', 'nonsense'], undefined],
		[[], undefined]
	])('%j is %s', (provides, name) => {
		expect(primaryKind(provides)?.name).toBe(name);
	});
});

describe('kindOf', () => {
	it('finds kinds by their provides value only', () => {
		expect(kindOf('context-servers')?.page?.slug).toBe('mcp-servers');
		expect(kindOf('grammars')).toBeUndefined();
		expect(kindOf('toString')).toBeUndefined();
	});

	it('keys every kind by its own provides value', () => {
		for (const [key, kind] of Object.entries(KINDS)) expect(kind.provide).toBe(key);
	});
});

describe('shownProvides', () => {
	it('drops minor kinds and keeps the extension’s order', () => {
		expect(
			shownProvides(['language-servers', 'grammars', 'context-servers', 'slash-commands'])
		).toEqual(['language-servers', 'context-servers']);
	});
});

describe('tagFor', () => {
	it('labels and colors every provides value, known or not', () => {
		expect(tagFor('context-servers')).toMatchObject({ tag: 'MCP', dot: 'bg-orange-400' });
		expect(tagFor('grammars')).toMatchObject({ tag: 'Grammar', dot: 'bg-cyan-400' });
		expect(tagFor('slash-commands')).toMatchObject({ tag: 'Slash Cmd', dot: 'bg-zinc-400' });
		expect(tagFor('new-thing')).toMatchObject({ tag: 'new-thing', dot: 'bg-zinc-400' });
	});
});
