import { describe, expect, it } from 'vitest';
import { themeTile } from './theme-tile.js';
import type { PreviewBundle, ThemeVariant } from './theme-preview.js';
import type { ExtensionRecord } from './types.js';

const v = (name: string, appearance: 'dark' | 'light') =>
	({ name, appearance, colors: {} }) as ThemeVariant;
const bundle: PreviewBundle = {
	generatedAt: '',
	icons: {},
	themes: {
		cat: { version: '1', variants: [v('Latte', 'light'), v('Mocha', 'dark'), v('Frappe', 'dark')] }
	}
};
const rec = (id: string) => ({ id }) as ExtensionRecord;

describe('themeTile', () => {
	it('picks the first variant of the appearance and counts that appearance', () => {
		expect(themeTile(bundle, rec('cat'), 'dark')).toMatchObject({
			variant: { name: 'Mocha' },
			count: 2
		});
		expect(themeTile(bundle, rec('cat'), 'light')).toMatchObject({
			variant: { name: 'Latte' },
			count: 1
		});
	});

	it('is null without previews, for unknown or prototype ids', () => {
		expect(themeTile(null, rec('cat'), 'dark')).toBeNull();
		expect(themeTile(bundle, rec('nope'), 'dark')).toBeNull();
		expect(themeTile(bundle, rec('constructor'), 'dark')).toBeNull();
	});
});
