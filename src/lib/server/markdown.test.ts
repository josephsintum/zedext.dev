import { describe, expect, it } from 'vitest';
import { headingSlug, markImageLinks, renderAlerts, renderMarkdown } from './markdown.js';

const render = (md: string) =>
	renderMarkdown(md, { owner: 'owner', repo: 'repo', branch: 'main', idPrefix: 'readme-' });

describe('renderMarkdown', () => {
	it('keeps Shiki colors on highlighted code', async () => {
		const html = await render('```rust\nfn main() {}\n```');
		expect(html).toContain('class="shiki shiki-themes github-light github-dark"');
		expect(html).toMatch(
			/<span style="--shiki-light:#[0-9A-F]+;--shiki-dark:#[0-9A-F]+">fn<\/span>/
		);
		expect(html).toContain('<span class="line">');
	});

	it('drops README styles and classes that could draw over the page', async () => {
		const html = await render(
			'<span class="fixed inset-0 z-50" style="position:fixed;inset:0;--shiki-light:#fff">x</span>'
		);
		expect(html).not.toContain('fixed');
		expect(html).not.toContain('position');
		expect(html).toContain('--shiki-light:#fff');
	});

	it('rejects non-color values in Shiki variables', async () => {
		const html = await render('<span style="--shiki-light:url(https://evil.test)">x</span>');
		expect(html).not.toContain('evil');
	});
});

describe('renderAlerts', () => {
	it('turns a GitHub callout into a titled alert', async () => {
		const html = await render('> [!NOTE]\n> We also have an icon pack');
		expect(html).toContain(
			'<blockquote class="alert alert-note"><p class="alert-title">Note</p><p>'
		);
		expect(html).not.toContain('[!NOTE]');
		expect(html).toContain('We also have an icon pack');
	});

	it('handles the marker in its own paragraph and any case', () => {
		expect(renderAlerts('<blockquote>\n<p>[!Warning]</p>\n<p>Careful</p></blockquote>')).toBe(
			'<blockquote class="alert alert-warning"><p class="alert-title">Warning</p><p>Careful</p></blockquote>'
		);
	});

	it('leaves no empty paragraph when a list or nothing follows the marker', async () => {
		const list = await render('> [!NOTE]\n>\n> - item');
		expect(list).toContain('<p class="alert-title">Note</p><ul>');
		expect(list).not.toContain('<p></p>');
		const bare = await render('> [!WARNING]');
		expect(bare).toContain('<p class="alert-title">Warning</p></blockquote>');
	});

	it('keeps a marker with text on the same line as a plain quote, like GitHub', async () => {
		const html = await render('> [!TIP] use the flag');
		expect(html).not.toContain('alert');
		expect(html).toContain('[!TIP] use the flag');
	});

	it('leaves ordinary quotes alone', () => {
		const quote = '<blockquote>\n<p>Just a quote</p>\n</blockquote>';
		expect(renderAlerts(quote)).toBe(quote);
	});
});

describe('markImageLinks', () => {
	it('marks links that hold only images', async () => {
		const html = await render('[![Stars](https://img.shields.io/x.svg)](https://github.com/a/b)');
		expect(html).toContain('<a class="image-link" href="https://github.com/a/b"');
	});

	it('leaves links with an image and a label alone', () => {
		const html = '<a href="https://x.dev"><img src="https://x.dev/i.svg" /> Download</a>';
		expect(markImageLinks(html)).toBe(html);
	});

	it('leaves text links alone', () => {
		const html = '<a href="https://x.dev">Docs</a>';
		expect(markImageLinks(html)).toBe(html);
	});
});

describe('README links and images', () => {
	it('points relative links at the file on GitHub', async () => {
		const html = await render(
			'[Contributing](CONTRIBUTING.md) [Docs](./docs/a.md) [Root](/LICENSE)'
		);
		expect(html).toContain('href="https://github.com/owner/repo/blob/main/CONTRIBUTING.md"');
		expect(html).toContain('href="https://github.com/owner/repo/blob/main/docs/a.md"');
		expect(html).toContain('href="https://github.com/owner/repo/blob/main/LICENSE"');
	});

	it("resolves links from the markdown file's own folder", async () => {
		const html = await renderMarkdown('[Settings](../configuring-zed.md)', {
			owner: 'o',
			repo: 'r',
			branch: 'main',
			dir: 'docs/src/languages',
			idPrefix: 'readme-'
		});
		expect(html).toContain('href="https://github.com/o/r/blob/main/docs/src/configuring-zed.md"');
	});

	it('leaves absolute and mailto links alone', async () => {
		const html = await render('[Zed](https://zed.dev) [Mail](mailto:a@b.dev)');
		expect(html).toContain('href="https://zed.dev"');
		expect(html).toContain('href="mailto:a@b.dev"');
	});

	it('loads images lazily from the raw file, with alt text', async () => {
		const html = await render("![Shot](./assets/shot.png)\n\n<img src='logo.svg'>");
		expect(html).toContain(
			'<img src="https://raw.githubusercontent.com/owner/repo/main/assets/shot.png" alt="Shot" loading="lazy" decoding="async" />'
		);
		expect(html).toContain(
			'src="https://raw.githubusercontent.com/owner/repo/main/logo.svg" alt=""'
		);
	});

	it('names image-only links that have no alt text after where they go', async () => {
		const html = await render(
			'<a href="https://github.com/a/b/stargazers"><img src="https://img.shields.io/x.svg"></a>'
		);
		expect(html).toContain('aria-label="github.com/a/b/stargazers"');
	});

	it('escapes & in code without a highlighter language', async () => {
		const html = await render('```unknownlang\na &lt; b && c\n```');
		expect(html).toContain('a &amp;lt; b &amp;&amp; c');
	});
});

describe('README headings', () => {
	it('moves headings down a level, keeping the page h1 the only one', async () => {
		const html = await render('# Title\n\n## Usage\n\n<h1 align="center">Raw</h1>');
		expect(html).toContain('<h2 id="readme-title" data-level="1">Title</h2>');
		expect(html).toContain('<h3 id="readme-usage" data-level="2">Usage</h3>');
		expect(html).toContain('<h2 data-level="1">Raw</h2>');
		expect(html).not.toContain('<h1');
	});

	it('starts at h2 whatever level the README starts at, without skipping levels', async () => {
		const html = await render('<h3>Intro</h3>\n\n## Usage\n\n### Setup');
		expect(html).toContain('<h2 data-level="3">Intro</h2>');
		expect(html).toContain('<h2 id="readme-usage" data-level="2">Usage</h2>');
		expect(html).toContain('<h3 id="readme-setup" data-level="3">Setup</h3>');
	});

	it('gives headings GitHub-style ids that a table of contents can link to', async () => {
		const html = await render('- [Install](#installation)\n\n## Installation\n\n## Installation');
		expect(html).toContain('href="#readme-installation"');
		expect(html).toContain('id="readme-installation"');
		expect(html).toContain('id="readme-installation-1"');
	});

	it("drops a README's own ids so it can't take over the page's", async () => {
		const html = await render('<h2 id="main">Hi</h2>');
		expect(html).toContain('<h2 data-level="2">Hi</h2>');
	});

	it('slugs like GitHub', () => {
		expect(headingSlug('Setup & Usage (v2)')).toBe('setup--usage-v2');
		expect(headingSlug('Español Ñ')).toBe('español-ñ');
	});
});

describe('review fixes', () => {
	it('keeps "#" and "#top" scrolling to the top', async () => {
		const html = await render('[Top](#) [Up](#top) [Install](#install)');
		expect(html).toContain('href="#"');
		expect(html).toContain('href="#top"');
		expect(html).toContain('href="#readme-install"');
	});

	it('ignores headings inside HTML comments when leveling', async () => {
		const html = await render('<!-- <h1>Old title</h1> -->\n\n## A\n\n## B');
		expect(html).toContain('<h2 id="readme-a" data-level="2">A</h2>');
		expect(html).toContain('<h2 id="readme-b" data-level="2">B</h2>');
	});

	it('never repeats an id, even against a literal "-1" heading', async () => {
		const html = await render('## Foo\n\n## Foo-1\n\n## Foo');
		expect(html.match(/id="readme-foo-1"/g)).toHaveLength(1);
		expect(html).toContain('id="readme-foo-2"');
	});

	it("drops a README's own readme- ids", async () => {
		const html = await render('<h2 id="readme-foo">Raw</h2>\n\n## Foo');
		expect(html.match(/id="readme-foo"/g)).toHaveLength(1);
		expect(html).toContain('<h2 data-level="2">Raw</h2>');
	});

	it('decodes entities and keeps combining marks in slugs, like GitHub', async () => {
		expect(await render('## Foo&nbsp;Bar')).toContain('id="readme-foo-bar"');
		expect(headingSlug('हिन्दी')).toBe('हिन्दी');
	});

	it('uses the prefix it is given, so documents on one page never share ids', async () => {
		const html = await renderMarkdown('## Added\n\n[Added](#added)', {
			owner: 'o',
			repo: 'r',
			branch: 'HEAD',
			idPrefix: 'changelog-'
		});
		expect(html).toContain('id="changelog-added"');
		expect(html).toContain('href="#changelog-added"');
	});

	it("sends a docs page's relative links to the published docs site", async () => {
		const html = await renderMarkdown('[Configuring Zed](../configuring-zed.md#settings)', {
			owner: 'zed-industries',
			repo: 'zed',
			branch: 'main',
			dir: 'docs/src/languages',
			idPrefix: 'docs-',
			siteBase: 'https://zed.dev/docs/languages/'
		});
		expect(html).toContain('href="https://zed.dev/docs/configuring-zed#settings"');
	});

	it("resolves a nested README's links from its own folder", async () => {
		const html = await renderMarkdown('[Guide](GUIDE.md) ![](shot.png)', {
			owner: 'o',
			repo: 'r',
			branch: 'main',
			dir: '.github',
			idPrefix: 'readme-'
		});
		expect(html).toContain('href="https://github.com/o/r/blob/main/.github/GUIDE.md"');
		expect(html).toContain('src="https://raw.githubusercontent.com/o/r/main/.github/shot.png"');
	});
});
