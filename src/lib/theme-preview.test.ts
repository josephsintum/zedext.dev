import { describe, expect, it } from 'vitest';
import {
	FILE_SAMPLES,
	fontStyleOf,
	parseIconThemeFile,
	parseJsonLenient,
	parseThemeFile,
	roleColor,
	svgDataUri,
	themeColors,
	firstVariantColors,
	haloColors,
	type ThemeVariant
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
		expect(v.name).toBe('Mocha');
		expect(v.appearance).toBe('dark');
		expect(themeColors(v)).toMatchObject({
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
		});
	});

	it('falls back for missing colors (seen in real themes)', () => {
		const style: Record<string, unknown> = {
			...fullStyle,
			syntax: { ...fullStyle.syntax, punctuation: undefined }
		};
		delete style['editor.line_number'];
		const [v] = parseThemeFile(theme(style));
		expect(themeColors(v).gutter).toBe('#6c7086'); // comment color
		expect(themeColors(v).punct).toBe('#cdd6f4'); // text color
	});

	it('rejects anything that is not a hex color', () => {
		const evil = 'red; background:url(//evil.example)';
		const [v] = parseThemeFile(
			theme({ ...fullStyle, syntax: { ...fullStyle.syntax, keyword: { color: evil } } })
		);
		expect(themeColors(v).keyword).toBe('#cdd6f4');
		expect(parseThemeFile(theme({ ...fullStyle, 'editor.background': evil }))).toEqual([]);
	});

	it('reads the Markdown, HTML and JSON colors when the theme defines them', () => {
		const [v] = parseThemeFile(
			theme({
				...fullStyle,
				syntax: {
					...fullStyle.syntax,
					title: { color: '#f38ba8', font_weight: 700 },
					emphasis: { color: '#89dceb', font_style: 'italic' },
					'emphasis.strong': { color: '#fab387' },
					link_text: { color: '#b4befe' },
					link_uri: { color: '#f5c2e7' },
					'text.literal': { color: '#a6e3a1' },
					tag: { color: '#89b4fa' },
					attribute: { color: '#f9e2af' },
					property: { color: '#b4befe' }
				}
			})
		);
		expect(themeColors(v)).toMatchObject({
			title: '#f38ba8',
			emphasis: '#89dceb',
			strong: '#fab387',
			linkText: '#b4befe',
			linkUri: '#f5c2e7',
			literal: '#a6e3a1',
			tag: '#89b4fa',
			attribute: '#f9e2af',
			property: '#b4befe'
		});
		expect(fontStyleOf(v, 'title')).toEqual({ italic: false, bold: true });
		expect(fontStyleOf(v, 'emphasis')).toEqual({ italic: true, bold: false });
	});

	it('leaves the extra colors out when the theme has none, to keep the bundle small', () => {
		const [v] = parseThemeFile(theme(fullStyle));
		expect(Object.keys(v.raw ?? {})).not.toContain('title');
		expect(Object.keys(v.raw ?? {})).not.toContain('tag');
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
		expect(themeColors(parseThemeFile(bgOnly('#00000000', 'dark'))[0]).bg).toBe('#000000');
		expect(themeColors(parseThemeFile(bgOnly('#ffffff00', 'light'))[0]).bg).toBe('#ffffff');
		const half = themeColors(parseThemeFile(bgOnly('#24273a80', 'dark'))[0]);
		expect(half.bg).toBe('#12141d');
		expect(half.status).toBe('#12141d');
	});

	it('leaves opaque colors alone, dropping a redundant ff alpha', () => {
		expect(themeColors(parseThemeFile(bgOnly('#1e1e2eff', 'dark'))[0]).bg).toBe('#1e1e2e');
		expect(themeColors(parseThemeFile(bgOnly('#1e1e2e', 'dark'))[0]).bg).toBe('#1e1e2e');
	});
});

describe('svgDataUri', () => {
	it('encodes SVG for use in an <img> src', () => {
		expect(svgDataUri('<svg a="1"/>')).toBe(
			'data:image/svg+xml;charset=utf-8,%3Csvg%20a%3D%221%22%2F%3E'
		);
	});
});

describe('roleColor', () => {
	const [v] = parseThemeFile(
		theme({ ...fullStyle, syntax: { ...fullStyle.syntax, emphasis: { color: '#89dceb' } } })
	);

	it('uses the role color when the theme defines it', () => {
		expect(roleColor(themeColors(v), 'keyword')).toBe('#cba6f7');
		expect(roleColor(themeColors(v), 'emphasis')).toBe('#89dceb');
	});

	it('falls back like Zed: emphasis.strong to emphasis, anything else to the text color', () => {
		expect(roleColor(themeColors(v), 'strong')).toBe('#89dceb');
		expect(roleColor(themeColors(v), 'tag')).toBe('#cdd6f4');
		expect(roleColor(themeColors(v), 'fg')).toBe('#cdd6f4');
	});
});

describe('raw colors and window chrome', () => {
	const ui = {
		...fullStyle,
		background: '#181825',
		'surface.background': '#1e1e2e',
		'title_bar.background': '#11111b',
		'tab.active_background': '#1e1e2e',
		'tab.inactive_background': '#181825',
		text: '#cdd6f4',
		'text.muted': '#a6adc8',
		icon: '#bac2de',
		'editor.active_line_number': '#f5e0dc',
		'editor.active_line.background': '#31324466',
		error: '#f38ba8',
		warning: '#f9e2af',
		players: [{ cursor: '#f5e0dc', selection: '#f5e0dc40' }]
	};

	it('stores only the keys a theme defines, under short names', () => {
		const [v] = parseThemeFile(
			theme({ ...fullStyle, syntax: { ...fullStyle.syntax, punctuation: undefined } })
		);
		expect(v.raw?.bg).toBe('#1e1e2e');
		expect(v.raw?.keyword).toBe('#cba6f7');
		expect(v.raw).not.toHaveProperty('punct');
		expect(v.raw).not.toHaveProperty('titleBar');
		expect(v).not.toHaveProperty('colors');
	});

	it('reads the window chrome keys, keeping alpha only where it overlays the editor', () => {
		const [v] = parseThemeFile(theme(ui));
		expect(themeColors(v)).toMatchObject({
			titleBar: '#11111b',
			tabActive: '#1e1e2e',
			tabInactive: '#181825',
			text: '#cdd6f4',
			textMuted: '#a6adc8',
			icon: '#bac2de',
			gutterActive: '#f5e0dc',
			activeLine: '#31324466',
			error: '#f38ba8',
			warning: '#f9e2af',
			cursor: '#f5e0dc'
		});
		expect(v.raw).toMatchObject({
			textMuted: '#a6adc8',
			activeLine: '#31324466',
			cursor: '#f5e0dc'
		});
	});

	it('fills missing chrome colors from their parents, like the Zed theme builder', () => {
		const c = themeColors(parseThemeFile(theme(fullStyle))[0]);
		expect(c).toMatchObject({
			tabActive: '#1e1e2e', // editor background
			tabInactive: '#1e1e2e',
			titleBar: '#11111b', // status bar
			text: '#cdd6f4', // editor text
			textMuted: '#cdd6f4',
			icon: '#cdd6f4',
			gutterActive: '#cdd6f4',
			activeLine: 'transparent',
			cursor: '#cdd6f4'
		});
		expect(c.error).toMatch(/^#/);
		expect(c.warning).toMatch(/^#/);
		const withSurface = themeColors(
			parseThemeFile(theme({ ...fullStyle, 'surface.background': '#222233' }))[0]
		);
		expect(withSurface.tabInactive).toBe('#222233');
	});

	it('still reads variants saved in the previous bundle format', () => {
		const legacy = {
			name: 'Old',
			appearance: 'light',
			colors: {
				bg: '#ffffff',
				fg: '#111111',
				gutter: '#999999',
				status: '#eeeeee',
				border: '#dddddd',
				keyword: '#aa00aa',
				string: '#00aa00',
				function: '#0000aa',
				type: '#aaaa00',
				comment: '#888888',
				number: '#aa5500',
				punct: '#111111',
				variable: '#111111'
			}
		} as ThemeVariant;
		expect(themeColors(legacy)).toMatchObject({
			bg: '#ffffff',
			keyword: '#aa00aa',
			titleBar: '#eeeeee',
			tabActive: '#ffffff',
			text: '#111111'
		});
	});
});

describe('firstVariantColors', () => {
	const bundle = {
		generatedAt: '',
		icons: {},
		themes: { cat: { version: '1', variants: parseThemeFile(theme(fullStyle)) } }
	};

	it('resolves the first variant of a theme', () => {
		expect(firstVariantColors(bundle, 'cat')?.bg).toBe('#1e1e2e');
	});

	it('is null for unknown ids, prototype keys and a missing bundle', () => {
		expect(firstVariantColors(bundle, 'nope')).toBeNull();
		expect(firstVariantColors(bundle, 'constructor')).toBeNull();
		expect(firstVariantColors(null, 'cat')).toBeNull();
	});
});

describe('compact storage', () => {
	it('drops colors that resolve the same without them, and opaque alpha', () => {
		const [v] = parseThemeFile(
			theme({
				...fullStyle,
				'editor.background': '#1e1e2eFF',
				'tab.active_background': '#1e1e2e', // same as the editor background
				text: '#cdd6f4', // same as the editor text
				'title_bar.background': '#11111b', // same as the status bar
				'tab.inactive_background': '#181825' // different: kept
			})
		);
		expect(v.raw?.bg).toBe('#1e1e2e');
		expect(v.raw).not.toHaveProperty('tabActive');
		expect(v.raw).not.toHaveProperty('text');
		expect(v.raw).not.toHaveProperty('titleBar');
		expect(v.raw?.tabInactive).toBe('#181825');
		expect(themeColors(v)).toMatchObject({
			tabActive: '#1e1e2e',
			text: '#cdd6f4',
			titleBar: '#11111b'
		});
	});
});

describe('haloColors', () => {
	it('uses the keyword, function and string colors', () => {
		const c = themeColors({
			name: 'T',
			appearance: 'dark',
			raw: {
				bg: '#111111',
				fg: '#eeeeee',
				keyword: '#ff00aa',
				function: '#00aaff',
				string: '#aaff00'
			}
		} as ThemeVariant);
		expect(haloColors(c)).toEqual(['#ff00aa', '#00aaff', '#aaff00']);
	});

	it('falls back to the text color when a theme leaves syntax colors out', () => {
		const c = themeColors({
			name: 'T',
			appearance: 'light',
			raw: { bg: '#ffffff', fg: '#222222' }
		} as ThemeVariant);
		expect(haloColors(c)).toEqual(['#222222', '#222222', '#222222']);
	});
});
