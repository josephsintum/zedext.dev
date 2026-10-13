import { describe, expect, it } from 'vitest';
import {
	FILE_SAMPLES,
	fontStyleOf,
	parseIconThemeFile,
	parseJsonLenient,
	parseThemeFile,
	svgDataUri
} from './theme-preview.js';

const theme = (style: Record<string, unknown>, extra: Record<string, unknown> = {}) =>
	JSON.stringify({ themes: [{ name: 'Mocha', appearance: 'dark', style, ...extra }] });

const fullStyle = {
	'editor.background': '#1e1e2e',
	'editor.foreground': '#cdd6f4',
	'editor.line_number': '#7f849c',
	'status_bar.background': '#11111b',
	border: '#45475a',
	syntax: {
		keyword: { color: '#cba6f7' },
		string: { color: '#a6e3a1' },
		function: { color: '#89b4fa' },
		type: { color: '#f9e2af' },
		comment: { color: '#6c7086' },
		number: { color: '#fab387' },
		punctuation: { color: '#94e2d5' },
		variable: { color: '#f5e0dc' }
	}
};

describe('parseThemeFile', () => {
	it('reads every color of a complete variant', () => {
		const [v] = parseThemeFile(theme(fullStyle));
		expect(v).toEqual({
			name: 'Mocha',
			appearance: 'dark',
			colors: {
				bg: '#1e1e2e',
				fg: '#cdd6f4',
				gutter: '#7f849c',
				status: '#11111b',
				border: '#45475a',
				keyword: '#cba6f7',
				string: '#a6e3a1',
				function: '#89b4fa',
				type: '#f9e2af',
				comment: '#6c7086',
				number: '#fab387',
				punct: '#94e2d5',
				variable: '#f5e0dc'
			}
		});
	});

	it('falls back for missing colors (seen in real themes)', () => {
		const style: Record<string, unknown> = {
			...fullStyle,
			syntax: { ...fullStyle.syntax, punctuation: undefined }
		};
		delete style['editor.line_number'];
		const [v] = parseThemeFile(theme(style));
		expect(v.colors.gutter).toBe('#6c7086'); // comment color
		expect(v.colors.punct).toBe('#cdd6f4'); // text color
	});

	it('rejects anything that is not a hex color', () => {
		const evil = 'red; background:url(//evil.example)';
		const [v] = parseThemeFile(
			theme({ ...fullStyle, syntax: { ...fullStyle.syntax, keyword: { color: evil } } })
		);
		expect(v.colors.keyword).toBe('#cdd6f4');
		expect(parseThemeFile(theme({ ...fullStyle, 'editor.background': evil }))).toEqual([]);
	});

	it('skips variants without a background or text color', () => {
		expect(parseThemeFile(theme({ syntax: {} }))).toEqual([]);
		expect(parseThemeFile('not json')).toEqual([]);
	});

	it('accepts JSONC (comments and trailing commas)', () => {
		const jsonc = `{
			// a comment with a "quote"
			"$schema": "https://zed.dev/schema/themes/v0.2.0.json",
			"themes": [{ "name": "X", "appearance": "light",
				"style": { "editor.background": "#ffffff", "editor.foreground": "#000000", }, },],
		}`;
		expect(parseThemeFile(jsonc)[0]).toMatchObject({ name: 'X', appearance: 'light' });
		expect(parseJsonLenient('{"url": "https://a//b"}')).toEqual({ url: 'https://a//b' });
	});
});

describe('parseIconThemeFile', () => {
	const svg = '<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>';
	const enc = (s: string) => new TextEncoder().encode(s);
	const files = new Map([
		['icons/rust.svg', enc(svg)],
		['icons/folder.svg', enc(svg)],
		['icons/huge.svg', enc(`<svg>${'x'.repeat(25_000)}</svg>`)],
		['icons/not-svg.svg', enc('<html>nope</html>')]
	]);
	const doc = (themes: unknown[]) => JSON.stringify({ themes });
	const variant = (name: string) => ({
		name,
		appearance: 'dark',
		directory_icons: { collapsed: './icons/folder.svg' },
		file_suffixes: { rs: 'rust', py: 'python', ts: 'huge', json: 'bad' },
		file_icons: {
			rust: { path: './icons/rust.svg' },
			python: { path: './icons/missing.svg' },
			huge: { path: './icons/huge.svg' },
			bad: { path: './icons/not-svg.svg' }
		}
	});

	it('maps sample files to their SVGs, dropping missing, oversized and non-SVG files', () => {
		const [v] = parseIconThemeFile(doc([variant('A')]), files);
		expect(v.folder).toBe(svg);
		const byLabel = Object.fromEntries(v.files.map((f) => [f.label, f.svg]));
		expect(byLabel['main.rs']).toBe(svg);
		expect(byLabel['app.py']).toBeNull();
		expect(byLabel['index.ts']).toBeNull();
		expect(byLabel['package.json']).toBeNull();
		expect(v.files.map((f) => f.label)).toEqual(FILE_SAMPLES.map((f) => f.label));
	});

	it('drops variants with no usable icons at all', () => {
		const hollow = {
			name: 'Hollow',
			appearance: 'dark',
			file_suffixes: { rs: 'missing' },
			file_icons: { missing: { path: './icons/missing.svg' } }
		};
		expect(parseIconThemeFile(doc([hollow]), files)).toEqual([]);
		expect(parseIconThemeFile(doc([hollow, variant('A')]), files).map((v) => v.name)).toEqual([
			'A'
		]);
	});

	it('keeps at most maxVariants variants', () => {
		expect(parseIconThemeFile(doc(['A', 'B', 'C'].map(variant)), files, 2)).toHaveLength(2);
	});
});

describe('font styles', () => {
	const styled = (syntax: Record<string, unknown>) =>
		JSON.stringify({
			themes: [
				{
					name: 'S',
					appearance: 'dark',
					style: { ...fullStyle, syntax: { ...fullStyle.syntax, ...syntax } }
				}
			]
		});

	it('reads italic and bold for the roles the preview draws', () => {
		const [v] = parseThemeFile(
			styled({
				comment: { color: '#6c7086', font_style: 'italic' },
				keyword: { color: '#cba6f7', font_style: 'italic', font_weight: 700 },
				type: { color: '#f9e2af', font_weight: 'bold' },
				punctuation: { color: '#94e2d5', font_weight: '800' },
				string: { color: '#a6e3a1', font_weight: 400 }
			})
		);
		expect(v.italic?.sort()).toEqual(['comment', 'keyword']);
		expect(v.bold?.sort()).toEqual(['keyword', 'punct', 'type']);
	});

	it('stores nothing for a theme without styles, so comments are not forced italic', () => {
		const [v] = parseThemeFile(theme(fullStyle));
		expect(v.italic).toBeUndefined();
		expect(v.bold).toBeUndefined();
		expect(fontStyleOf(v, 'comment')).toEqual({ italic: false, bold: false });
	});

	it('answers per role, including roles a theme never styles', () => {
		const [v] = parseThemeFile(styled({ comment: { color: '#6c7086', font_style: 'italic' } }));
		expect(fontStyleOf(v, 'comment')).toEqual({ italic: true, bold: false });
		expect(fontStyleOf(v, 'fg')).toEqual({ italic: false, bold: false });
	});
});

describe('translucent backgrounds', () => {
	const bgOnly = (bg: string, appearance: string) =>
		JSON.stringify({
			themes: [
				{
					name: 'B',
					appearance,
					style: {
						'editor.background': bg,
						'editor.foreground': '#cad3f5',
						'status_bar.background': bg
					}
				}
			]
		});

	it('composites transparent backgrounds over black (dark) or white (light)', () => {
		expect(parseThemeFile(bgOnly('#00000000', 'dark'))[0].colors.bg).toBe('#000000');
		expect(parseThemeFile(bgOnly('#ffffff00', 'light'))[0].colors.bg).toBe('#ffffff');
		const half = parseThemeFile(bgOnly('#24273a80', 'dark'))[0].colors;
		expect(half.bg).toBe('#12141d');
		expect(half.status).toBe('#12141d');
	});

	it('leaves opaque colors alone, including 8-digit ones', () => {
		expect(parseThemeFile(bgOnly('#1e1e2eff', 'dark'))[0].colors.bg).toBe('#1e1e2eff');
		expect(parseThemeFile(bgOnly('#1e1e2e', 'dark'))[0].colors.bg).toBe('#1e1e2e');
	});
});

describe('svgDataUri', () => {
	it('encodes SVG for use in an <img> src', () => {
		expect(svgDataUri('<svg a="1"/>')).toBe(
			'data:image/svg+xml;charset=utf-8,%3Csvg%20a%3D%221%22%2F%3E'
		);
	});
});
