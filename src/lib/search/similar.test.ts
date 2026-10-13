import { describe, expect, it } from 'vitest';
import { createIndex } from './engine.js';
import { findSimilar } from './similar.js';
import type { ExtensionRecord } from '$lib/types.js';

const rec = (o: Partial<ExtensionRecord> & { id: string }): ExtensionRecord => ({
	name: o.id,
	description: null,
	authors: [],
	provides: [],
	download_count: 0,
	github_stars: 0,
	github_license: null,
	github_pushed_at: null,
	published_at: '2026-01-01T00:00:00Z',
	version: '1.0.0',
	repository: null,
	...o
});

const index = createIndex([
	rec({
		id: 'pyrefly',
		name: 'Pyrefly',
		description: 'Python type checker',
		provides: ['language-servers'],
		download_count: 54_000
	}),
	rec({
		id: 'ty',
		name: 'Ty',
		description: 'Fast Python type checker',
		provides: ['language-servers'],
		download_count: 52_000
	}),
	rec({
		id: 'basedpyright',
		name: 'BasedPyright',
		description: 'Python type checking',
		provides: ['language-servers'],
		download_count: 68_000
	}),
	rec({
		id: 'gopls-x',
		name: 'Gopls extra',
		description: 'Go language server',
		provides: ['language-servers'],
		download_count: 90_000
	}),
	rec({
		id: 'python-snippets',
		name: 'Python Snippets',
		description: 'Python snippets',
		provides: ['snippets'],
		download_count: 104_000
	}),
	rec({
		id: 'catppuccin',
		name: 'Catppuccin',
		description: 'Soothing pastel theme',
		provides: ['themes'],
		download_count: 1_100_000
	}),
	rec({
		id: 'tokyo-night',
		name: 'Tokyo Night',
		description: 'Tokyo Night Themes',
		provides: ['themes'],
		download_count: 430_000
	}),
	rec({ id: 'one-dark', name: 'One Dark', provides: ['themes'], download_count: 300_000 })
]);
const ids = (rs: ExtensionRecord[]) => rs.map((r) => r.id);

describe('findSimilar', () => {
	it('prefers same-kind extensions that share words, and never returns itself', () => {
		const similar = ids(findSimilar(index, 'pyrefly', 3));
		expect(similar.slice(0, 2).sort()).toEqual(['basedpyright', 'ty']);
		expect(similar).not.toContain('pyrefly');
		expect(similar).not.toContain('python-snippets'); // different kind
	});

	it('fills with popular same-kind extensions when words do not overlap (themes)', () => {
		expect(ids(findSimilar(index, 'one-dark', 2))).toEqual(['catppuccin', 'tokyo-night']);
	});

	it('ranks extensions for the same language first', () => {
		const langIndex = createIndex([
			rec({
				id: 'java',
				name: 'Java',
				description: 'Java support.',
				provides: ['languages', 'language-servers'],
				download_count: 1_300_000
			}),
			rec({
				id: 'kotlin',
				name: 'Kotlin',
				description: 'Kotlin support.',
				provides: ['languages', 'language-servers'],
				download_count: 290_000
			}),
			rec({
				id: 'html',
				name: 'HTML',
				description: 'HTML support.',
				provides: ['languages'],
				download_count: 7_000_000
			}),
			rec({
				id: 'ruff',
				name: 'Ruff',
				description: 'Python linter and formatter',
				provides: ['language-servers'],
				download_count: 118_000
			}),
			rec({
				id: 'tex-formatter',
				name: 'TeX formatter',
				description: 'A formatter for TeX',
				provides: ['language-servers'],
				download_count: 9_000
			}),
			rec({
				id: 'pyrefly',
				name: 'Pyrefly',
				description: 'Type checker',
				provides: ['language-servers'],
				download_count: 54_000
			})
		]);
		expect(ids(findSimilar(langIndex, 'java', 2))).toEqual(['kotlin', 'html']);
		expect(ids(findSimilar(langIndex, 'ruff', 1))).toEqual(['pyrefly']);
	});

	it('returns nothing for unknown ids', () => {
		expect(findSimilar(index, 'nope')).toEqual([]);
	});
});
