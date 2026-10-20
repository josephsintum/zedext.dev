/**
 * The kinds of extension, keyed by the `provides` values in Zed's registry: what each is
 * called, its colors, and its category page. Every page that names or colors a kind reads it
 * from here. Color classes are whole strings so Tailwind finds them.
 */

export interface Kind {
	provide: string;
	/** Short uppercase tag on cards and list rows, e.g. "MCP" */
	tag: string;
	/** What people call one, e.g. "MCP server" (the search window) */
	name: string;
	/** The category tab, e.g. "MCP Servers" */
	plural: string;
	/** Tag background and text */
	badge: string;
	dot: string;
	/** Card hover: whole border (grid cards) or left border (ExtensionCard) */
	hoverBorder: string;
	hoverBorderLeft: string;
	/** Its list at /<slug>. Themes and languages have their own pages instead */
	page?: { slug: string; title: string; description: string };
}

/** In category tab order */
export const KINDS = {
	'language-servers': {
		provide: 'language-servers',
		tag: 'LSP',
		name: 'Language server',
		plural: 'Language Servers',
		badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
		dot: 'bg-emerald-400',
		hoverBorder: 'hover:border-emerald-400 dark:hover:border-emerald-500',
		hoverBorderLeft: 'hover:border-l-emerald-400',
		page: {
			slug: 'language-servers',
			title: 'Zed language servers',
			description:
				'Language server extensions for the Zed editor: completion, diagnostics and go to definition for more languages and tools.'
		}
	},
	'context-servers': {
		provide: 'context-servers',
		tag: 'MCP',
		name: 'MCP server',
		plural: 'MCP Servers',
		badge: 'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-400',
		dot: 'bg-orange-400',
		hoverBorder: 'hover:border-orange-400 dark:hover:border-orange-500',
		hoverBorderLeft: 'hover:border-l-orange-400',
		page: {
			slug: 'mcp-servers',
			title: 'MCP servers for Zed',
			description:
				'Model Context Protocol servers that give Zed’s AI agent access to more tools and data.'
		}
	},
	'agent-servers': {
		provide: 'agent-servers',
		tag: 'Agent',
		name: 'Agent',
		plural: 'Agent Servers',
		badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
		dot: 'bg-amber-400',
		hoverBorder: 'hover:border-amber-400 dark:hover:border-amber-500',
		hoverBorderLeft: 'hover:border-l-amber-400',
		page: {
			slug: 'agent-servers',
			title: 'Zed agent servers',
			description: 'External AI agents you can run inside the Zed editor.'
		}
	},
	themes: {
		provide: 'themes',
		tag: 'Theme',
		name: 'Theme',
		plural: 'Themes',
		badge: 'bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-400',
		dot: 'bg-violet-400',
		hoverBorder: 'hover:border-violet-400 dark:hover:border-violet-500',
		hoverBorderLeft: 'hover:border-l-violet-400'
	},
	'icon-themes': {
		provide: 'icon-themes',
		tag: 'Icons',
		name: 'Icon theme',
		plural: 'Icon Themes',
		badge: 'bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-950 dark:text-fuchsia-400',
		dot: 'bg-fuchsia-400',
		hoverBorder: 'hover:border-fuchsia-400 dark:hover:border-fuchsia-500',
		hoverBorderLeft: 'hover:border-l-fuchsia-400',
		page: {
			slug: 'icon-themes',
			title: 'Zed icon themes',
			description: 'File icon themes for the Zed editor, ranked by downloads.'
		}
	},
	'debug-adapters': {
		provide: 'debug-adapters',
		tag: 'Debug',
		name: 'Debugger',
		plural: 'Debug Adapters',
		badge: 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-400',
		dot: 'bg-rose-400',
		hoverBorder: 'hover:border-rose-400 dark:hover:border-rose-500',
		hoverBorderLeft: 'hover:border-l-rose-400',
		page: {
			slug: 'debug-adapters',
			title: 'Zed debug adapters',
			description: 'Debugger extensions for the Zed editor.'
		}
	},
	snippets: {
		provide: 'snippets',
		tag: 'Snippets',
		name: 'Snippets',
		plural: 'Snippets',
		badge: 'bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-400',
		dot: 'bg-teal-400',
		hoverBorder: 'hover:border-teal-400 dark:hover:border-teal-500',
		hoverBorderLeft: 'hover:border-l-teal-400',
		page: {
			slug: 'snippets',
			title: 'Zed snippets',
			description: 'Snippet packs for the Zed editor, ranked by downloads.'
		}
	},
	languages: {
		provide: 'languages',
		tag: 'Language',
		name: 'Language',
		plural: 'Languages',
		badge: 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-400',
		dot: 'bg-sky-400',
		hoverBorder: 'hover:border-sky-400 dark:hover:border-sky-500',
		hoverBorderLeft: 'hover:border-l-sky-400'
	}
} satisfies Record<string, Kind>;

export type Provide = keyof typeof KINDS;

/**
 * Which kind an extension mainly is, when it provides several: the language beats its server
 * and debugger (Java provides all three), and a server beats its MCP server or icons.
 */
const PRIMARY_ORDER: Provide[] = [
	'themes',
	'languages',
	'language-servers',
	'context-servers',
	'agent-servers',
	'debug-adapters',
	'icon-themes',
	'snippets'
];

/** Every language has a grammar, so these never label or color a card */
const MINOR_TAGS: Record<string, { tag: string; badge?: string; dot?: string }> = {
	grammars: {
		tag: 'Grammar',
		badge: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-400',
		dot: 'bg-cyan-400'
	},
	'slash-commands': { tag: 'Slash Cmd' },
	'indexed-docs-providers': { tag: 'Docs' }
};

const UNKNOWN = {
	badge: 'bg-zinc-50 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-400',
	dot: 'bg-zinc-400'
};

export function kindOf(provide: string): Kind | undefined {
	return Object.hasOwn(KINDS, provide) ? KINDS[provide as Provide] : undefined;
}

export function primaryKind(provides: readonly string[]): Kind | undefined {
	const provide = PRIMARY_ORDER.find((p) => provides.includes(p));
	return provide && KINDS[provide];
}

/** The provides worth a tag on a card, in the extension's own order */
export function shownProvides(provides: readonly string[]): string[] {
	return provides.filter((p) => !Object.hasOwn(MINOR_TAGS, p));
}

/** A tag for any provides value, including minor and unknown ones (the extension page lists all) */
export function tagFor(provide: string): Pick<Kind, 'tag' | 'badge' | 'dot'> {
	const known =
		kindOf(provide) ?? (Object.hasOwn(MINOR_TAGS, provide) ? MINOR_TAGS[provide] : undefined);
	return {
		tag: known?.tag ?? provide,
		badge: known?.badge ?? UNKNOWN.badge,
		dot: known?.dot ?? UNKNOWN.dot
	};
}

/** Themes and icon themes: the extensions with color previews */
export const isThemeLike = (provides: readonly string[]) =>
	provides.includes('themes') || provides.includes('icon-themes');
