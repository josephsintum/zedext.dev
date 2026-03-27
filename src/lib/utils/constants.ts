export const CATEGORIES = [
	{ slug: 'all', label: 'All', provides: null },
	{ slug: 'language-servers', label: 'Language Servers', provides: 'language-servers' },
	{ slug: 'context-servers', label: 'MCP Servers', provides: 'context-servers' },
	{ slug: 'agent-servers', label: 'Agent Servers', provides: 'agent-servers' },
	{ slug: 'themes', label: 'Themes', provides: 'themes' },
	{ slug: 'icon-themes', label: 'Icon Themes', provides: 'icon-themes' },
	{ slug: 'debug-adapters', label: 'Debug Adapters', provides: 'debug-adapters' },
	{ slug: 'snippets', label: 'Snippets', provides: 'snippets' },
	{ slug: 'languages', label: 'Languages', provides: 'languages' }
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]['slug'];

export const SORT_OPTIONS = [
	{ value: 'downloads', label: 'Most Downloads' },
	{ value: 'updated', label: 'Recently Updated' },
	{ value: 'stars', label: 'Most Stars' },
	{ value: 'name', label: 'Name' }
] as const;

export type SortOption = (typeof SORT_OPTIONS)[number]['value'];

export const ZED_API_BASE = 'https://api.zed.dev';
export const GITHUB_API_BASE = 'https://api.github.com';
export const EXTENSIONS_TOML_URL =
	'https://raw.githubusercontent.com/zed-industries/extensions/main/extensions.toml';
