import { describe, expect, it } from 'vitest';
import { buildHub, faqJsonLd, hubSummaries, matchesHub } from './language-hub.js';
import { getLanguageHub, type LanguageHub } from './languages.js';
import type { ExtensionRecord } from './types.js';

function record(o: Partial<ExtensionRecord> & { id: string }): ExtensionRecord {
	return {
		name: o.id,
		description: null,
		authors: [],
		provides: [],
		download_count: 0,
		github_stars: 0,
		github_license: null,
		github_pushed_at: null,
		published_at: '2026-01-01T00:00:00Z',
		first_published_at: null,
		version: '1.0.0',
		repository: null,
		...o
	};
}

const python = getLanguageHub('python')!;
const records = [
	record({ id: 'ruff', name: 'Ruff', provides: ['language-servers'], download_count: 118_000 }),
	record({
		id: 'pyrefly',
		name: 'Pyrefly',
		provides: ['language-servers'],
		download_count: 54_000
	}),
	record({ id: 'ty', name: 'Ty', provides: ['language-servers'], download_count: 52_000 }),
	record({ id: 'pylsp', name: 'Python LSP', provides: [], download_count: 131_000 }),
	record({
		id: 'python-snippets',
		name: 'Python Snippets',
		provides: ['snippets'],
		download_count: 104_000
	}),
	record({
		id: 'python-refactoring',
		name: 'PythonRefactoring',
		provides: [],
		download_count: 79_000
	}),
	record({
		id: 'python-requirements',
		name: 'Python requirements and constraints',
		provides: ['languages', 'grammars'],
		download_count: 142_000
	}),
	// "written in Rust" in the description must not pull a Python tool into the Rust hub
	record({
		id: 'stakpak',
		name: 'Stakpak',
		description: 'An agent written in Rust',
		download_count: 35_000
	}),
	// Themes never belong in a hub
	record({
		id: 'python-dark-theme',
		name: 'Python Dark',
		provides: ['themes'],
		download_count: 9_000
	})
];

describe('matchesHub', () => {
	it('matches on id and name words, not descriptions or themes', () => {
		expect(matchesHub(python, records[0])).toBe(true);
		expect(matchesHub(python, records[3])).toBe(true);
		expect(matchesHub(getLanguageHub('rust')!, records[7])).toBe(false);
		expect(matchesHub(python, records[8])).toBe(false);
	});

	it('matches whole words only, so JavaScript extensions stay out of the Java hub', () => {
		const java = getLanguageHub('java')!;
		expect(
			matchesHub(java, record({ id: 'javascript-snippets', name: 'JavaScript Snippets' }))
		).toBe(false);
		expect(matchesHub(java, record({ id: 'java', name: 'Java' }))).toBe(true);
	});

	it('honours include and exclude lists', () => {
		const hub: LanguageHub = { ...python, include: ['stakpak'], exclude: ['ruff'] };
		expect(matchesHub(hub, records[7])).toBe(true);
		expect(matchesHub(hub, records[0])).toBe(false);
	});
});

describe('buildHub', () => {
	const data = buildHub(python, records);
	const ids = (key: string) => data.groups.find((g) => g.key === key)?.items.map((r) => r.id);

	it('groups by job, most downloaded first', () => {
		expect(ids('language-servers')).toEqual(['pylsp', 'pyrefly', 'ty']);
		expect(ids('tooling')).toEqual(['ruff', 'python-refactoring']);
		expect(ids('syntax')).toEqual(['python-requirements']);
		expect(ids('snippets')).toEqual(['python-snippets']);
		expect(data.total).toBe(7);
	});

	it('never lists MCP or agent servers as language servers', () => {
		const js = getLanguageHub('javascript')!;
		const hub = buildHub(js, [
			record({
				id: 'svelte-mcp',
				name: 'Svelte MCP Server',
				provides: ['context-servers'],
				download_count: 38_000
			}),
			record({
				id: 'vue',
				name: 'Vue',
				provides: ['languages', 'language-servers'],
				download_count: 679_000
			})
		]);
		const group = (key: string) => hub.groups.find((g) => g.key === key)?.items.map((r) => r.id);
		expect(group('language-servers')).toEqual(['vue']);
		expect(group('other')).toEqual(['svelte-mcp']);
	});

	it('flags extensions that duplicate built-in support', () => {
		expect(data.alsoBuiltIn.sort()).toEqual(['ruff', 'ty']);
	});

	it('never returns empty groups, even with no matching extensions', () => {
		const empty = buildHub(python, []);
		expect(empty.groups).toEqual([]);
		expect(empty.total).toBe(0);
		expect(empty.faq[0].a).toMatch(/built into Zed/);
	});

	it('generates FAQ answers from data', () => {
		expect(data.faq.map((f) => f.q)).toEqual([
			'Do I need an extension for Python in Zed?',
			'Which Python language server should I use in Zed?',
			'What are the most popular Python extensions for Zed?'
		]);
		expect(data.faq[0].a).toMatch(/^No\. Python support is built into Zed/);
		// Built-in items keep their capitalisation (they start with proper nouns)
		expect(data.faq[0].a).toContain('Basedpyright and Ty language servers');
		expect(data.faq[0].a).toContain('Ruff linting and formatting');
		expect(data.faq[2].a).toContain('Python requirements and constraints');
	});

	it('points languages without built-in support at their main extension', () => {
		const java = getLanguageHub('java')!;
		const hub = buildHub(java, [record({ id: 'java', name: 'Java', download_count: 1_312_000 })]);
		expect(hub.primary?.id).toBe('java');
		expect(hub.faq[0].a).toMatch(/^Yes\. Install the Java extension/);
	});
});

describe('faqJsonLd', () => {
	it('produces FAQPage structured data', () => {
		expect(faqJsonLd([{ q: 'Q?', a: 'A.' }])).toEqual({
			'@context': 'https://schema.org',
			'@type': 'FAQPage',
			mainEntity: [
				{ '@type': 'Question', name: 'Q?', acceptedAnswer: { '@type': 'Answer', text: 'A.' } }
			]
		});
	});
});

describe('hubSummaries', () => {
	it('lists every hub with its match count and whether Zed has it built in', () => {
		const summaries = hubSummaries(records);
		const py = summaries.find((s) => s.slug === 'python')!;
		expect(py).toMatchObject({ name: 'Python', builtIn: true });
		expect(py.count).toBe(records.filter((r) => matchesHub(python, r)).length);
		expect(summaries.find((s) => s.slug === 'java')).toMatchObject({ builtIn: false });
	});
});
