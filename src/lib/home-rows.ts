import type { ExtensionRecord } from './types.js';

/**
 * Hand-picked, like the VS Code Marketplace's Featured row: good extensions that aren't
 * already popular. Refresh every month or two, and don't bring back past picks.
 */
export const FEATURED_IDS = [
	'windows-batch', // Windows Batch/CMD script support
	'oxc', // Oxlint and Oxfmt: very fast JS/TS linting and formatting
	'codebook', // code-aware spell checker that knows identifiers from typos
	'markdown-oxide', // Obsidian-style notes: links, backlinks and daily notes in Markdown
	'mcp-server-sonarqube', // lets Zed's agent check code quality and security issues
	'emoji-completions', // type ':' and an emoji name to insert it
	'cargo-appraiser', // shows outdated Cargo.toml dependencies inline
	'wakatime', // automatic coding-time tracking
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
