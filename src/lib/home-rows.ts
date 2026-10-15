import type { ExtensionRecord } from './types.js';

/**
 * Hand-picked, like the VS Code Marketplace's Featured row: good extensions that aren't
 * already popular. Refresh every month or two, and don't bring back past picks.
 */
export const FEATURED_IDS = [
	'codebook', // code-aware spell checker that knows identifiers from typos
	'harper', // offline grammar and spelling checker, nothing leaves your machine
	'tombi', // fast TOML language server and formatter
	'oxc', // Oxlint and Oxfmt: very fast JS/TS linting and formatting
	'tsgo', // try TypeScript 7's native compiler today
	'pytest-language-server', // go-to-definition and completions for pytest fixtures
	'chrome-devtools-mcp', // lets Zed's agent drive and inspect Chrome
	'discord-presence' // show what you're coding on Discord
];

/** The featured extensions still in the registry, in list order. */
export function featuredExtensions(
	records: ExtensionRecord[],
	ids: readonly string[] = FEATURED_IDS
): ExtensionRecord[] {
	const byId = new Map(records.map((r) => [r.id, r]));
	return ids.flatMap((id) => byId.get(id) ?? []);
}

/** The most-downloaded extensions, themes included. */
export function mostPopular(records: ExtensionRecord[], limit = 16): ExtensionRecord[] {
	return [...records].sort((a, b) => b.download_count - a.download_count).slice(0, limit);
}
