import type { ExtensionCardData, ExtensionRecord } from '$lib/types.js';
import type { PreviewBundle } from '$lib/theme-preview.js';
import { GUIDE_LISTS, resolveList } from '$lib/guides.js';
import { featuredExtensions, mostPopular } from '$lib/home-rows.js';
import { hubSummaries } from '$lib/language-hub.js';
import { themeEntries } from '$lib/theme-picker.js';

const CARDS_PER_ROW = 4;
const THEMES_ROW = 8;

/** Only the fields a card draws: the page ships its data a second time for hydration */
export function cardData(r: ExtensionRecord): ExtensionCardData {
	const { id, name, description, authors, provides, download_count, github_stars, version } = r;
	return { id, name, description, authors, provides, download_count, github_stars, version };
}

/** The homepage rows, for its HTML and its Markdown */
export function homeData(records: ExtensionRecord[], previews: PreviewBundle | null) {
	const guides = GUIDE_LISTS.map((list) => {
		const { items, total } = resolveList(list, records, CARDS_PER_ROW);
		const { slug, title, emoji, description, builtIn } = list;
		return {
			list: { slug, title, emoji, description, builtIn },
			items: items.map(({ id, name, download_count }) => ({ id, name, download_count })),
			total
		};
	}).filter((g) => g.items.length > 0);

	return {
		featured: featuredExtensions(records).map(cardData),
		popular: mostPopular(records).map(cardData),
		hubs: hubSummaries(records),
		guides,
		// Most themes are dark-first; the picker has the light toggle
		themes: themeEntries(previews, records, 'dark', THEMES_ROW),
		extensionCount: records.length
	};
}

export type HomeData = ReturnType<typeof homeData>;
