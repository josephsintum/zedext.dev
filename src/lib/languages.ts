/**
 * Language hubs (/languages/<slug>). Built-in facts follow Zed's docs
 * (zed-industries/zed docs/src/languages/<slug>.md): JavaScript, Python, Rust, TypeScript,
 * Go and C/C++ are native; Java, Ruby, PHP and Elixir come from their main extension.
 */

export interface LanguageHub {
	slug: string;
	name: string;
	emoji: string;
	/** Matched against words in an extension's id and name (not its description) */
	keywords: string[];
	include?: string[];
	exclude?: string[];
	/** What Zed supports natively, shown in the "Built into Zed" box */
	builtIn: string[];
	/** Extensions whose functionality Zed also ships natively */
	alsoBuiltIn?: string[];
	/** The extension that provides the language when it isn't built in */
	primary?: string;
}

export const LANGUAGE_HUBS: LanguageHub[] = [
	{
		slug: 'python',
		name: 'Python',
		emoji: '🐍',
		keywords: [
			'python',
			'pyright',
			'basedpyright',
			'pylsp',
			'ruff',
			'pyrefly',
			'django',
			'pytest',
			'ty'
		],
		builtIn: [
			'Python syntax and language support',
			'Basedpyright and Ty language servers',
			'Ruff linting and formatting'
		],
		alsoBuiltIn: ['ruff', 'basedpyright', 'ty']
	},
	{
		slug: 'rust',
		name: 'Rust',
		emoji: '🦀',
		keywords: ['rust', 'cargo', 'crates'],
		builtIn: ['Rust syntax and language support (rust-analyzer)']
	},
	{
		slug: 'typescript',
		name: 'TypeScript',
		emoji: '🔷',
		keywords: ['typescript', 'tsx', 'deno', 'tsgo', 'biome'],
		builtIn: ['TypeScript and TSX support', 'React support']
	},
	{
		slug: 'javascript',
		name: 'JavaScript',
		emoji: '🟨',
		keywords: [
			'javascript',
			'js',
			'node',
			'npm',
			'biome',
			'vue',
			'svelte',
			'astro',
			'nextjs',
			'react'
		],
		builtIn: ['JavaScript syntax and language support (vtsls)']
	},
	{
		slug: 'go',
		name: 'Go',
		emoji: '🐹',
		keywords: ['golang', 'gopls', 'templ', 'gotmpl', 'gosum'],
		include: ['go-snippets'],
		builtIn: ['Go syntax and language support (gopls)']
	},
	{
		slug: 'java',
		name: 'Java',
		emoji: '☕',
		keywords: ['java', 'kotlin', 'gradle', 'maven', 'groovy', 'scala', 'jdtls'],
		builtIn: [],
		primary: 'java'
	},
	{
		slug: 'ruby',
		name: 'Ruby',
		emoji: '💎',
		keywords: ['ruby', 'rails', 'erb', 'rubocop', 'rspec', 'sorbet'],
		builtIn: [],
		primary: 'ruby'
	},
	{
		slug: 'php',
		name: 'PHP',
		emoji: '🐘',
		keywords: ['php', 'laravel', 'blade', 'phpstan', 'psalm', 'phpcs', 'phpmd', 'composer'],
		builtIn: [],
		primary: 'php'
	},
	{
		slug: 'elixir',
		name: 'Elixir',
		emoji: '💧',
		keywords: ['elixir', 'phoenix', 'heex', 'erlang', 'gleam'],
		builtIn: [],
		primary: 'elixir'
	},
	{
		slug: 'cpp',
		name: 'C and C++',
		emoji: '⚙️',
		keywords: ['cpp', 'clangd', 'cmake', 'neocmake', 'clice', 'objective'],
		builtIn: ['C and C++ syntax and language support (clangd)']
	}
];

export function getLanguageHub(slug: string): LanguageHub | undefined {
	return LANGUAGE_HUBS.find((h) => h.slug === slug);
}

export function zedDocsUrl(hub: LanguageHub): string {
	return `https://zed.dev/docs/languages/${hub.slug}`;
}
