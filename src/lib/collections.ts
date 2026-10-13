import type { ExtensionRecord } from './types.js';

export interface Collection {
	slug: string;
	title: string;
	emoji: string;
	description: string;
	/** In display order. Ids missing from the snapshot are skipped. */
	ids: string[];
}

export const COLLECTIONS: Collection[] = [
	{
		slug: 'python-setup',
		title: 'Python setup',
		emoji: '🐍',
		description:
			'Extras on top of Zed’s built-in Python support: requirements files, snippets, tests and frameworks.',
		ids: ['python-requirements', 'python-snippets', 'pytest-language-server', 'django', 'pyrefly']
	},
	{
		slug: 'rust-setup',
		title: 'Rust setup',
		emoji: '🦀',
		description:
			'Crate versions, Cargo.toml help and snippets to go with Zed’s built-in rust-analyzer.',
		ids: ['crates-lsp', 'cargo-tom', 'cargo-appraiser', 'rust-snippets', 'toml']
	},
	{
		slug: 'mcp-servers',
		title: 'Best MCP servers',
		emoji: '🤖',
		description: 'The most-used Model Context Protocol servers for Zed’s AI agent.',
		ids: [
			'mcp-server-context7',
			'mcp-server-github',
			'postgres-context-server',
			'mcp-server-sequential-thinking',
			'mcp-server-brave-search',
			'mcp-server-puppeteer'
		]
	},
	{
		slug: 'dark-themes',
		title: 'Top dark themes',
		emoji: '🌙',
		description: 'The most downloaded dark color themes for Zed.',
		ids: ['catppuccin', 'tokyo-night', 'one-dark-pro', 'vscode-dark-modern', 'github-theme']
	},
	{
		slug: 'web-dev',
		title: 'Web development',
		emoji: '🌐',
		description: 'Frameworks, HTML and tooling for building for the web in Zed.',
		ids: ['html', 'emmet', 'vue', 'svelte', 'astro', 'biome']
	},
	{
		slug: 'everyday-files',
		title: 'Everyday file types',
		emoji: '🗂️',
		description: 'Syntax support for the config and data files every project has.',
		ids: ['toml', 'dockerfile', 'docker-compose', 'make', 'sql', 'env', 'log', 'git-firefly']
	}
];

export function getCollection(slug: string): Collection | undefined {
	return COLLECTIONS.find((c) => c.slug === slug);
}

export function resolveCollection(
	c: Collection,
	byId: Map<string, ExtensionRecord>
): ExtensionRecord[] {
	return c.ids.flatMap((id) => byId.get(id) ?? []);
}
