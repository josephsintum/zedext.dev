import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import StatIcon, { STAT_ICON_PATHS } from './StatIcon.svelte';
import StatIconSprite from './StatIconSprite.svelte';

describe('StatIcon', () => {
	it('points at its symbol in the sprite instead of repeating the path', () => {
		const { body } = render(StatIcon, { props: { name: 'stars', class: 'h-5 w-5' } });
		expect(body).toContain('<use href="#stat-stars"');
		expect(body).toContain('class="h-5 w-5"');
		expect(body).not.toContain('<path');
	});

	it('has a symbol in the sprite for every icon', () => {
		const { body } = render(StatIconSprite);
		for (const [name, d] of Object.entries(STAT_ICON_PATHS)) {
			expect(body).toContain(`id="stat-${name}"`);
			expect(body).toContain(`d="${d}"`);
		}
	});
});
