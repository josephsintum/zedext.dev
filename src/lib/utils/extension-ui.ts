import type { ExtensionHit } from '$lib/types.js';

export const filterProvides = (provides: string[]) =>
	provides.filter((p) => !['grammars', 'slash-commands', 'indexed-docs-providers'].includes(p));

export const hoverBorders: Record<string, string> = {
	themes: 'hover:border-violet-400 dark:hover:border-violet-500',
	'icon-themes': 'hover:border-fuchsia-400 dark:hover:border-fuchsia-500',
	languages: 'hover:border-sky-400 dark:hover:border-sky-500',
	'language-servers': 'hover:border-emerald-400 dark:hover:border-emerald-500',
	'context-servers': 'hover:border-orange-400 dark:hover:border-orange-500',
	'agent-servers': 'hover:border-amber-400 dark:hover:border-amber-500',
	'debug-adapters': 'hover:border-rose-400 dark:hover:border-rose-500',
	snippets: 'hover:border-teal-400 dark:hover:border-teal-500'
};

export function getHoverBorder(hit: ExtensionHit): string {
	const provides = filterProvides(hit.provides);
	if (provides.length === 0) return '';
	return hoverBorders[provides[0]] ?? '';
}

export const provideLabel: Record<string, string> = {
	themes: 'Theme',
	'icon-themes': 'Icons',
	languages: 'Language',
	'language-servers': 'LSP',
	'context-servers': 'MCP',
	'agent-servers': 'Agent',
	snippets: 'Snippets',
	'debug-adapters': 'Debug'
};

export const provideDotColor: Record<string, string> = {
	themes: 'bg-violet-400',
	'icon-themes': 'bg-fuchsia-400',
	languages: 'bg-sky-400',
	'language-servers': 'bg-emerald-400',
	'context-servers': 'bg-orange-400',
	'agent-servers': 'bg-amber-400',
	'debug-adapters': 'bg-rose-400',
	snippets: 'bg-teal-400'
};
