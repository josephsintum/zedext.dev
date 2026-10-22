import { describe, expect, it } from 'vitest';
import { homeMarkdown, notFoundMarkdown } from './agent-markdown.js';
import type { HomeData } from './home.js';

const card = (id: string, name: string, description: string | null, downloads: number) => ({
	id,
	name,
	description,
	authors: ['someone'],
	provides: ['languages'],
	download_count: downloads,
	github_stars: 0,
	version: '1.0.0'
});

const home: HomeData = {
	featured: [card('codebook', 'Codebook', 'A *fast* [spell] checker.\nSecond line', 162_337)],
	popular: [card('html', 'HTML', null, 7_522_564)],
	hubs: [{ slug: 'python', name: 'Python', emoji: '🐍', builtIn: true, count: 42 }],
	guides: [
		{
			list: {
				slug: 'vim',
				title: 'Vim users',
				emoji: '⌨️',
				description: 'Modal editing.',
				builtIn: ['Vim mode']
			},
			items: [{ id: 'vim-snippets', name: 'Vim Snippets', download_count: 900 }],
			total: 12
		}
	],
	themes: [
		{
			id: 'catppuccin',
			name: 'Catppuccin',
			author: 'Catppuccin',
			downloads: 1_197_587,
			variantCount: 4,
			palette: {} as HomeData['themes'][number]['palette']
		}
	],
	extensionCount: 1592
};

describe('homeMarkdown', () => {
	const md = homeMarkdown(home);

	it('starts with a title and a summary', () => {
		expect(md).toMatch(/^# ZedExt: extensions for the Zed editor\n\n> Every extension/);
		expect(md).toContain('(1,592 today)');
	});

	it('lists every homepage row with absolute links', () => {
		expect(md).toContain('## Featured');
		expect(md).toContain('- [HTML](https://zedext.dev/extensions/html) (7.5M downloads)');
		expect(md).toContain(
			'- [Catppuccin](https://zedext.dev/themes?appearance=dark&theme=catppuccin) (1.2M downloads)'
		);
		expect(md).toContain('### [Vim users](https://zedext.dev/guides/vim)');
		expect(md).toContain('Built in: Vim mode');
		expect(md).toContain('- [Python](https://zedext.dev/languages/python) (42 extensions)');
	});

	it('keeps registry text on one line and escapes Markdown in it', () => {
		expect(md).toContain(': A \\*fast\\* \\[spell\\] checker. Second line (162k downloads)');
	});

	it('skips empty rows', () => {
		const empty = homeMarkdown({ ...home, featured: [], themes: [], guides: [], hubs: [] });
		expect(empty).not.toContain('## Featured');
		expect(empty).not.toContain('## Themes');
		expect(empty).toContain('## Most popular');
	});
});

describe('notFoundMarkdown', () => {
	it('names the path and points to search, the sitemap and llms.txt', () => {
		const md = notFoundMarkdown('/extensions/gone');
		expect(md).toMatch(/^# Page not found/);
		expect(md).toContain('`/extensions/gone`');
		expect(md).toContain('https://zedext.dev/sitemap.xml');
		expect(md).toContain('https://zedext.dev/llms.txt');
	});
});
