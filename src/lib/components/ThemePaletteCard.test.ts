import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import ThemePaletteCard from './ThemePaletteCard.svelte';
import type { ThemeEntry } from '$lib/theme-picker.js';

const entry: ThemeEntry = {
	id: 'catppuccin',
	name: 'Catppuccin',
	author: 'Catppuccin',
	downloads: 1_200_000,
	variantCount: 6,
	palette: {
		bg: '#303446',
		keyword: '#ca9ee6',
		function: '#8caaee',
		string: '#a6d189',
		type: '#e5c890',
		number: '#ef9f76',
		comment: '#949cbb'
	}
};

/** Each circle is ringed in the theme's background so overlapping circles stay distinct */
const rings = (html: string) => html.split('box-shadow: 0 0 0 2px #303446').length - 1;

describe('ThemePaletteCard', () => {
	it('draws the six syntax colors as circles on the theme background when asked', () => {
		const { body } = render(ThemePaletteCard, { props: { entry, circles: true } });
		expect(rings(body)).toBe(6);
		for (const color of ['#ca9ee6', '#8caaee', '#a6d189', '#e5c890', '#ef9f76', '#949cbb']) {
			expect(body).toContain(`background-color: ${color}`);
		}
		expect(body).toContain('background-color: #303446');
	});

	it('keeps the strip by default, as on the homepage', () => {
		const { body } = render(ThemePaletteCard, { props: { entry } });
		expect(rings(body)).toBe(0);
		expect(body).toContain('background-color: #303446');
	});
});
