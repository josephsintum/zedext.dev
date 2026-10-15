import { describe, expect, it } from 'vitest';
import {
	cardColors,
	filterThemes,
	pickerState,
	themeEntries,
	themeHref,
	themeVariants,
	type ThemeEntry
} from './theme-picker.js';
import type { PreviewBundle, ThemeColors, ThemeVariant } from './theme-preview.js';
import type { ExtensionRecord } from './types.js';

const colors = (bg: string) => ({ bg }) as ThemeColors;
const v = (name: string, appearance: 'dark' | 'light') =>
	({ name, appearance, colors: colors(name) }) as ThemeVariant;
const bundle = (themes: Record<string, ThemeVariant[]>): PreviewBundle => ({
	generatedAt: '',
	icons: {},
	themes: Object.fromEntries(
		Object.entries(themes).map(([id, variants]) => [id, { version: '1', variants }])
	)
});
const rec = (id: string, downloads: number) =>
	({
		id,
		name: id.toUpperCase(),
		authors: ['Ann <a@b.c>'],
		download_count: downloads
	}) as ExtensionRecord;

describe('themeEntries', () => {
	const previews = bundle({
		cat: [v('Latte', 'light'), v('Mocha', 'dark'), v('Frappe', 'dark')],
		night: [v('Night', 'dark')],
		orphan: [v('Gone', 'dark')],
		constructor: [v('Proto', 'dark')]
	});
	const records = [rec('night', 5), rec('cat', 9), rec('constructor', 1)];

	it('lists themes with a variant of the appearance, by downloads, with just the card colors', () => {
		const dark = themeEntries(previews, records, 'dark');
		expect(dark.map((e) => e.id)).toEqual(['cat', 'night', 'constructor']);
		expect(dark[0]).toMatchObject({
			name: 'CAT',
			author: 'Ann',
			downloads: 9,
			variantCount: 2,
			palette: { bg: 'Mocha' }
		});
		expect(Object.keys(dark[0].palette).sort()).toEqual(
			['bg', 'comment', 'function', 'keyword', 'number', 'string', 'type'].sort()
		);
		expect(dark[0]).not.toHaveProperty('variants');
		expect(themeEntries(previews, records, 'light').map((e) => e.id)).toEqual(['cat']);
	});

	it('skips themes missing from the snapshot and caps the list', () => {
		expect(themeEntries(previews, records, 'dark', 1).map((e) => e.id)).toEqual(['cat']);
		expect(themeEntries(previews, records, 'dark').some((e) => e.id === 'orphan')).toBe(false);
	});

	it('is empty without previews', () => {
		expect(themeEntries(null, records, 'dark')).toEqual([]);
	});
});

describe('pickerState', () => {
	const entry = (id: string) => ({ id }) as ThemeEntry;
	const entries = { dark: [entry('night'), entry('cat')], light: [entry('cat'), entry('paper')] };
	const at = (q: string) => pickerState(new URL(`https://x.dev/themes${q}`), entries);

	it('defaults to the top dark theme', () => {
		expect(at('')).toEqual({ appearance: 'dark', themeId: 'night' });
	});

	it('reads the appearance and theme from the URL', () => {
		expect(at('?appearance=light&theme=paper')).toEqual({ appearance: 'light', themeId: 'paper' });
	});

	it('finds the appearance a theme has when the URL leaves it out', () => {
		expect(at('?theme=paper')).toEqual({ appearance: 'light', themeId: 'paper' });
	});

	it('falls back for unknown values', () => {
		expect(at('?appearance=sepia&theme=nope')).toEqual({ appearance: 'dark', themeId: 'night' });
		expect(at('?appearance=light&theme=night')).toEqual({ appearance: 'light', themeId: 'cat' });
	});
});

describe('themeHref', () => {
	it('links to the picker with the theme selected', () => {
		expect(themeHref('cat', 'light')).toBe('/themes?appearance=light&theme=cat');
	});
});

describe('themeVariants', () => {
	const previews = bundle({ cat: [v('Latte', 'light'), v('Mocha', 'dark')] });

	it('returns every variant of a theme, both appearances', () => {
		expect(themeVariants(previews, 'cat')?.map((x) => x.name)).toEqual(['Latte', 'Mocha']);
	});

	it('is null for unknown ids, prototype keys and a missing bundle', () => {
		expect(themeVariants(previews, 'nope')).toBeNull();
		expect(themeVariants(previews, 'constructor')).toBeNull();
		expect(themeVariants(null, 'cat')).toBeNull();
	});
});

describe('filterThemes', () => {
	const entry = (id: string, name: string, author: string) => ({ id, name, author }) as ThemeEntry;
	const entries = [
		entry('catppuccin', 'Catppuccin', 'Catppuccin Org'),
		entry('nord', 'Nord', 'Arctic Ice Studio'),
		entry('one-dark-pro', 'One Dark Pro', 'binaryify')
	];
	const ids = (q: string) => filterThemes(entries, q).map((e) => e.id);

	it('matches name, author or id, ignoring case', () => {
		expect(ids('NORD')).toEqual(['nord']);
		expect(ids('arctic')).toEqual(['nord']);
		expect(ids('dark-pro')).toEqual(['one-dark-pro']);
	});

	it('needs every word to match', () => {
		expect(ids('one pro')).toEqual(['one-dark-pro']);
		expect(ids('one nord')).toEqual([]);
	});

	it('returns everything for an empty filter', () => {
		expect(ids('  ')).toEqual(['catppuccin', 'nord', 'one-dark-pro']);
	});
});

describe('cardColors', () => {
	const palette = {
		bg: '#303446',
		keyword: '#ca9ee6',
		function: '#8caaee',
		string: '#a6d189',
		type: '#e5c890',
		number: '#ef9f76',
		comment: '#949cbb'
	};

	it('lists the six syntax colors in role order', () => {
		expect(cardColors(palette)).toEqual([
			'#ca9ee6',
			'#8caaee',
			'#a6d189',
			'#e5c890',
			'#ef9f76',
			'#949cbb'
		]);
	});

	it('shows a color once when a theme reuses it', () => {
		expect(cardColors({ ...palette, number: '#8caaee', comment: '#8CAAEE' })).toEqual([
			'#ca9ee6',
			'#8caaee',
			'#a6d189',
			'#e5c890'
		]);
	});

	it('treats short and opaque-alpha spellings of a color as the same color', () => {
		// type and comment repeat string (#aabbcc); number repeats function (#8caaee)
		expect(
			cardColors({
				...palette,
				string: '#aabbcc',
				type: '#abc',
				number: '#8CAAEEFF',
				comment: '#abcf'
			})
		).toEqual(['#ca9ee6', '#8caaee', '#aabbcc']);
	});

	it('returns each color as the theme wrote it', () => {
		expect(cardColors({ ...palette, function: '#ABC', number: '#123456FF' })).toEqual([
			'#ca9ee6',
			'#ABC',
			'#a6d189',
			'#e5c890',
			'#123456FF',
			'#949cbb'
		]);
	});

	it('keeps colors that differ only in transparency apart', () => {
		expect(cardColors({ ...palette, number: '#ca9ee680' })).toContain('#ca9ee680');
	});

	it('keeps one color for a theme that sets none (every role falls back to the text color)', () => {
		const fg = '#d0d0d0';
		const bare = {
			bg: '#000000',
			keyword: fg,
			function: fg,
			string: fg,
			type: fg,
			number: fg,
			comment: fg
		};
		expect(cardColors(bare)).toEqual([fg]);
	});
});
