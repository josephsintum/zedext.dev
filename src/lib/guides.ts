import { categoryPageForProvides } from './categories.js';
import type { ExtensionRecord } from './types.js';
import { hasKeyword, nameWords } from './words.js';

export interface GuideList {
	slug: string;
	title: string;
	emoji: string;
	description: string;
	/** What Zed already does for this workflow, shown before the extensions */
	builtIn?: string[];
	match: {
		/** Exactly these extensions (curated picks such as themes), ranked by downloads */
		ids?: string[];
		/** Any of these */
		provides?: string[];
		/** Exact words in id + name, as on the language hubs */
		keywords?: string[];
		/** Keyword rules skip extensions providing any of these (default KEYWORD_EXCLUDES) */
		excludeProvides?: string[];
	};
	/** Shown first, in this order, when present in the snapshot */
	pin?: string[];
	/** Never shown */
	hide?: string[];
	/** Most items on the list page (default 48) */
	limit?: number;
}

/** Keyword rules match names; these kinds have their own lists */
const KEYWORD_EXCLUDES = ['themes', 'icon-themes', 'context-servers', 'agent-servers'];
const DEFAULT_LIMIT = 48;

/**
 * Guides come from 2025–26 research (Hacker News, Zed docs, GitHub issues) and download
 * counts. Agents such as Claude Code install from Zed's ACP Registry, not as extensions.
 */
export const GUIDE_LISTS: GuideList[] = [
	{
		slug: 'ai-agents',
		title: 'AI agent coding',
		emoji: '🤖',
		description:
			'Run Claude Code, Codex or Zed’s own agent, and give it more context with MCP servers.',
		builtIn: [
			'Agent panel and parallel threads',
			'Edit predictions',
			'Claude Code, Codex and Gemini CLI from the ACP Registry'
		],
		match: { provides: ['context-servers'] }
	},
	{
		slug: 'vscode',
		title: 'Coming from VS Code',
		emoji: '🧭',
		description: 'Keep the look you’re used to: themes and file icons.',
		builtIn: ['VS Code keymap (base_keymap)', 'Settings importer'],
		match: {
			ids: [
				'catppuccin',
				'catppuccin-icons',
				'material-icon-theme',
				'vscode-dark-modern',
				'one-dark-pro',
				'vscode-icons',
				'github-theme',
				'dracula'
			]
		}
	},
	{
		slug: 'vim',
		title: 'Vim, Neovim and Helix',
		emoji: '⌨️',
		description: 'Modal editing is built in. Bring your colorscheme.',
		builtIn: ['Vim and Helix modes', 'Relative line numbers', 'Which-key'],
		match: {
			ids: [
				'tokyo-night',
				'nvim-nightfox',
				'kanagawa-themes',
				'rose-pine-theme',
				'everforest',
				'gruvbox-material',
				'neovim-default'
			]
		}
	},
	{
		slug: 'web-frontend',
		title: 'Web frontend',
		emoji: '🌐',
		description: 'Frameworks, markup and styling beyond what ships with Zed.',
		builtIn: ['TypeScript, JSX and TSX', 'Tailwind', 'Prettier and ESLint'],
		match: {
			keywords: [
				'html',
				'css',
				'scss',
				'sass',
				'less',
				'emmet',
				'vue',
				'svelte',
				'astro',
				'angular',
				'react',
				'nextjs',
				'prisma',
				'graphql',
				'deno',
				'biome',
				'oxc',
				'htmx',
				'unocss',
				'ember',
				'solid',
				'jsx',
				'postcss',
				'stylelint'
			]
		}
	},
	{
		slug: 'devops',
		title: 'DevOps and config files',
		emoji: '☁️',
		description: 'Containers, infrastructure as code, build and CI files.',
		builtIn: ['YAML, JSON and Bash', 'Remote development over SSH', 'Dev containers'],
		match: {
			keywords: [
				'dockerfile',
				'docker',
				'compose',
				'terraform',
				'make',
				'makefile',
				'nix',
				'helm',
				'ansible',
				'kubernetes',
				'nginx',
				'justfile',
				'toml',
				'env',
				'ini',
				'actions',
				'gitlab',
				'yaml',
				'proto'
			]
		},
		hide: ['github-monochrome-theme']
	},
	{
		slug: 'writing',
		title: 'Notes and writing',
		emoji: '✍️',
		description: 'Markdown notes, papers and spell checking.',
		builtIn: ['Markdown preview', 'Mermaid diagrams'],
		match: {
			keywords: [
				'markdown',
				'latex',
				'typst',
				'spell',
				'cspell',
				'codebook',
				'harper',
				'mermaid',
				'typos',
				'vale',
				'asciidoc',
				'rst',
				'org'
			]
		}
	}
];

export function getGuideList(slug: string): GuideList | undefined {
	return GUIDE_LISTS.find((c) => c.slug === slug);
}

export function matchesList(c: GuideList, r: ExtensionRecord): boolean {
	const m = c.match;
	if (m.ids) return m.ids.includes(r.id);
	if (m.provides && !m.provides.some((p) => r.provides.includes(p))) return false;
	if (m.keywords) {
		const excluded = m.excludeProvides ?? KEYWORD_EXCLUDES;
		if (excluded.some((p) => r.provides.includes(p))) return false;
		if (!hasKeyword(nameWords(r), m.keywords)) return false;
	}
	return true;
}

/** Pins first (in order), then matches by downloads; hidden ids never appear. */
export function resolveList(
	c: GuideList,
	records: ExtensionRecord[],
	limit = c.limit ?? DEFAULT_LIMIT
): { items: ExtensionRecord[]; total: number } {
	const hidden = new Set(c.hide ?? []);
	const byId = new Map(records.map((r) => [r.id, r]));
	const pinned = (c.pin ?? []).flatMap((id) => {
		const r = byId.get(id);
		return r && !hidden.has(id) ? [r] : [];
	});
	const pinnedIds = new Set(pinned.map((r) => r.id));
	const matched = records
		.filter((r) => !hidden.has(r.id) && !pinnedIds.has(r.id) && matchesList(c, r))
		.sort((a, b) => b.download_count - a.download_count);
	const all = [...pinned, ...matched];
	return { items: all.slice(0, limit), total: all.length };
}

/** The full category page behind a list, linked when the list page is capped */
export function browseAll(c: GuideList): { href: string; label: string } | null {
	const provides =
		c.match.provides?.length === 1 && !c.match.keywords && !c.match.ids
			? c.match.provides[0]
			: null;
	const page = provides ? categoryPageForProvides(provides) : undefined;
	return page ? { href: `/${page.slug}`, label: page.title } : null;
}

/**
 * Where an old /discover URL moved: the page itself is now the homepage, the theme picker
 * (and its JSON) lives at /themes, and the guides at /guides/<slug>. Null for
 * anything that never existed.
 */
export function discoverRedirect(path: string, search: string): string | null {
	if (path === '') return '/';
	if (path === 'themes') return `/themes${search}`;
	if (path === 'themes.json') return `/themes.json${search}`;
	// The path arrives decoded; re-encode the id so "#" or line breaks can't change the target
	const theme = /^themes\/([^/]+)\.json$/.exec(path);
	if (theme) return `/themes/${encodeURIComponent(theme[1])}.json`;
	return getGuideList(path) ? `/guides/${path}` : null;
}
