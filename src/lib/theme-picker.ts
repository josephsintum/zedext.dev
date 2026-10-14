import {
	themeColors,
	type PreviewBundle,
	type ThemeColors,
	type ThemeVariant
} from './theme-preview.js';
import type { ExtensionRecord } from './types.js';
import { parseAuthor } from './utils/parse-author.js';

/** The theme picker at /discover/themes: one preview, a dark/light toggle and palette cards. */

export type Appearance = 'dark' | 'light';

export interface ThemeEntry {
	id: string;
	name: string;
	author: string;
	downloads: number;
	/** How many variants of this appearance the theme ships */
	variantCount: number;
	/** The first variant's colors, drawn as the strip on top of the card */
	palette: CardPalette;
}

/** Only what the card strip draws; full variants load when someone shows interest */
export const PALETTE_ROLES = [
	'keyword',
	'function',
	'string',
	'type',
	'number',
	'comment'
] as const;
export type CardPalette = Pick<ThemeColors, 'bg' | (typeof PALETTE_ROLES)[number]>;

function cardPalette(v: ThemeVariant): CardPalette {
	const c = themeColors(v);
	return {
		bg: c.bg,
		keyword: c.keyword,
		function: c.function,
		string: c.string,
		type: c.type,
		number: c.number,
		comment: c.comment
	};
}

/** Themes with a variant of this appearance, most downloaded first. */
export function themeEntries(
	previews: PreviewBundle | null,
	records: ExtensionRecord[],
	appearance: Appearance,
	limit = Infinity
): ThemeEntry[] {
	if (!previews) return [];
	return records
		.flatMap((r) => {
			if (!Object.hasOwn(previews.themes, r.id)) return [];
			const variants = previews.themes[r.id].variants.filter((x) => x.appearance === appearance);
			if (variants.length === 0) return [];
			return [
				{
					id: r.id,
					name: r.name,
					author: r.authors[0] ? parseAuthor(r.authors[0]).name : '',
					downloads: r.download_count,
					variantCount: variants.length,
					palette: cardPalette(variants[0])
				}
			];
		})
		.sort((a, b) => b.downloads - a.downloads)
		.slice(0, limit);
}

/** Which appearance and theme the URL asks for, falling back to the top dark theme. */
export function pickerState(
	url: URL,
	entries: Record<Appearance, ThemeEntry[]>
): { appearance: Appearance; themeId: string | null } {
	const asked = url.searchParams.get('appearance');
	const theme = url.searchParams.get('theme');
	const has = (a: Appearance) => !!theme && entries[a].some((e) => e.id === theme);

	let appearance: Appearance = asked === 'light' ? 'light' : 'dark';
	if (asked !== 'dark' && asked !== 'light' && !has('dark') && has('light')) appearance = 'light';

	const themeId = has(appearance) ? theme : (entries[appearance][0]?.id ?? null);
	return { appearance, themeId };
}

export function themeHref(id: string, appearance: Appearance): string {
	return `/discover/themes?appearance=${appearance}&theme=${encodeURIComponent(id)}`;
}

/** Every variant of one theme (both appearances), for the preview; null if unknown. */
export function themeVariants(previews: PreviewBundle | null, id: string): ThemeVariant[] | null {
	if (!previews || !Object.hasOwn(previews.themes, id)) return null;
	return previews.themes[id].variants;
}
