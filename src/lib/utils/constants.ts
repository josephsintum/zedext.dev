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

export interface BuiltinFeature {
	name: string;
	keywords: string[];
	message: string;
	docsUrl: string;
}

// Sourced from zed/crates/extensions_ui/src/extensions_ui.rs
export const BUILTIN_FEATURES: BuiltinFeature[] = [
	{
		name: 'Tailwind CSS',
		keywords: ['tail', 'tailwind'],
		message: 'Tailwind CSS support is built-in to Zed!',
		docsUrl: '/docs/languages/tailwindcss'
	},
	{
		name: 'Python',
		keywords: ['python', 'py'],
		message: 'Python support is built-in to Zed!',
		docsUrl: '/docs/languages/python'
	},
	{
		name: 'Rust',
		keywords: ['rust', 'rs'],
		message: 'Rust support is built-in to Zed!',
		docsUrl: '/docs/languages/rust'
	},
	{
		name: 'TypeScript',
		keywords: ['typescript', 'ts'],
		message: 'TypeScript support is built-in to Zed!',
		docsUrl: '/docs/languages/typescript'
	},
	{
		name: 'React',
		keywords: ['react'],
		message: 'React support is built-in to Zed!',
		docsUrl: '/docs/languages/typescript'
	},
	{
		name: 'Go',
		keywords: ['golang'],
		message: 'Go support is built-in to Zed!',
		docsUrl: '/docs/languages/go'
	},
	{
		name: 'C',
		keywords: ['clang'],
		message: 'C support is built-in to Zed!',
		docsUrl: '/docs/languages/c'
	},
	{
		name: 'C++',
		keywords: ['c++', 'cpp'],
		message: 'C++ support is built-in to Zed!',
		docsUrl: '/docs/languages/cpp'
	},
	{
		name: 'Shell',
		keywords: ['sh', 'bash'],
		message: 'Shell support is built-in to Zed!',
		docsUrl: '/docs/languages/bash'
	},
	{
		name: 'Vim',
		keywords: ['vim'],
		message: 'Vim support is built-in to Zed!',
		docsUrl: '/docs/vim'
	},
	{
		name: 'Git',
		keywords: ['git'],
		message: 'Zed comes with basic Git support — more features are coming in the future.',
		docsUrl: '/docs/git'
	},
	{
		name: 'Ruff',
		keywords: ['ruff'],
		message: 'Ruff (linter for Python) support is built-in to Zed!',
		docsUrl: '/docs/languages/python#code-formatting--linting'
	},
	{
		name: 'Basedpyright',
		keywords: ['basedpyright', 'pyright'],
		message: 'Basedpyright (Python language server) support is built-in to Zed!',
		docsUrl: '/docs/languages/python#basedpyright'
	},
	{
		name: 'Ty',
		keywords: ['ty'],
		message: 'Ty (Python language server) support is built-in to Zed!',
		docsUrl: '/docs/languages/python'
	},
	{
		name: 'Claude Agent',
		keywords: ['claude', 'claude code', 'claude agent'],
		message: 'Claude Agent support is built-in to Zed!',
		docsUrl: '/docs/ai/external-agents#claude-agent'
	},
	{
		name: 'Codex CLI',
		keywords: ['codex', 'codex cli'],
		message: 'Codex CLI support is built-in to Zed!',
		docsUrl: '/docs/ai/external-agents#codex-cli'
	},
	{
		name: 'Gemini CLI',
		keywords: ['gemini', 'gemini cli'],
		message: 'Gemini CLI support is built-in to Zed!',
		docsUrl: '/docs/ai/external-agents#gemini-cli'
	}
];

export function getMatchingBuiltinFeatures(query: string): BuiltinFeature[] {
	if (!query) return [];
	const q = query.toLowerCase().trim();
	return BUILTIN_FEATURES.filter((f) => f.keywords.some((kw) => q.includes(kw)));
}
