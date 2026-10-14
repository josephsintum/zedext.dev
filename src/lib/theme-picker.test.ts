import { describe, expect, it } from 'vitest';
import {
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
	const at = (q: string) => pickerState(new URL(`https://x.dev/discover/themes${q}`), entries);

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
		expect(themeHref('cat', 'light')).toBe('/discover/themes?appearance=light&theme=cat');
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
