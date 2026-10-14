import { describe, expect, it } from 'vitest';
import { markImageLinks, renderAlerts, renderMarkdown } from './markdown.js';

const render = (md: string) => renderMarkdown(md, 'owner', 'repo', 'main');

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
