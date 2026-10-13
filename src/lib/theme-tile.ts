import type { PreviewBundle, ThemeVariant } from './theme-preview.js';
import type { ExtensionRecord } from './types.js';

export interface ThemeTileData {
	record: ExtensionRecord;
	variant: ThemeVariant;
	/** How many variants of this appearance the theme ships */
	count: number;
}

export function themeTile(
	previews: PreviewBundle | null,
	record: ExtensionRecord,
	appearance: 'dark' | 'light'
): ThemeTileData | null {
	if (!previews || !Object.hasOwn(previews.themes, record.id)) return null;
	const matching = previews.themes[record.id].variants.filter((x) => x.appearance === appearance);
	return matching.length > 0 ? { record, variant: matching[0], count: matching.length } : null;
}
