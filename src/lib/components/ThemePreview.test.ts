import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import ThemePreview from './ThemePreview.svelte';
import type { ThemeVariant } from '$lib/theme-preview.js';

const variants = [
	{
		name: 'Night',
		appearance: 'dark',
		raw: {
			bg: '#111111',
			fg: '#eeeeee',
			keyword: '#ff00aa',
			function: '#00aaff',
			string: '#aaff00'
		}
	}
] as ThemeVariant[];

describe('ThemePreview halo', () => {
	it('draws a glow in the variant colors when asked', () => {
		const { body } = render(ThemePreview, { props: { variants, size: 'lg', halo: true } });
		expect(body).toContain('theme-halo');
		expect(body).toContain('--halo-1: #ff00aa');
		expect(body).toContain('--halo-2: #00aaff');
		expect(body).toContain('--halo-3: #aaff00');
	});

	it('leaves extension page previews without a glow', () => {
		const { body } = render(ThemePreview, { props: { variants } });
		expect(body).not.toContain('theme-halo');
	});
});
