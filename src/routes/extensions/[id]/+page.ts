import type { PageLoad } from './$types';

// The preview components and their sample code (~8 KB) load only on theme and icon-theme pages.
// Importing them here, not in the page, keeps them out of the other extension pages' JS while
// the server still renders them (it runs this load too).
export const load: PageLoad = async ({ data }) => ({
	...data,
	ThemePreview: data.themePreview?.length
		? (await import('$lib/components/ThemePreview.svelte')).default
		: null,
	IconThemePreview: data.iconPreview?.length
		? (await import('$lib/components/IconThemePreview.svelte')).default
		: null
});
