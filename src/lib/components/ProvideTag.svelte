<script lang="ts">
	import { cn } from '$lib/utils.js';

	let { provide, class: className }: { provide: string; class?: string } = $props();

	const styles: Record<string, { bg: string; text: string; dot: string }> = {
		themes: {
			bg: 'bg-violet-50 dark:bg-violet-950',
			text: 'text-violet-600 dark:text-violet-400',
			dot: 'bg-violet-400'
		},
		'icon-themes': {
			bg: 'bg-fuchsia-50 dark:bg-fuchsia-950',
			text: 'text-fuchsia-600 dark:text-fuchsia-400',
			dot: 'bg-fuchsia-400'
		},
		languages: {
			bg: 'bg-sky-50 dark:bg-sky-950',
			text: 'text-sky-600 dark:text-sky-400',
			dot: 'bg-sky-400'
		},
		grammars: {
			bg: 'bg-cyan-50 dark:bg-cyan-950',
			text: 'text-cyan-600 dark:text-cyan-400',
			dot: 'bg-cyan-400'
		},
		'language-servers': {
			bg: 'bg-emerald-50 dark:bg-emerald-950',
			text: 'text-emerald-600 dark:text-emerald-400',
			dot: 'bg-emerald-400'
		},
		'context-servers': {
			bg: 'bg-orange-50 dark:bg-orange-950',
			text: 'text-orange-600 dark:text-orange-400',
			dot: 'bg-orange-400'
		},
		'agent-servers': {
			bg: 'bg-amber-50 dark:bg-amber-950',
			text: 'text-amber-600 dark:text-amber-400',
			dot: 'bg-amber-400'
		},
		'debug-adapters': {
			bg: 'bg-rose-50 dark:bg-rose-950',
			text: 'text-rose-600 dark:text-rose-400',
			dot: 'bg-rose-400'
		},
		snippets: {
			bg: 'bg-teal-50 dark:bg-teal-950',
			text: 'text-teal-600 dark:text-teal-400',
			dot: 'bg-teal-400'
		}
	};

	const label: Record<string, string> = {
		themes: 'Theme',
		'icon-themes': 'Icons',
		languages: 'Language',
		grammars: 'Grammar',
		'language-servers': 'LSP',
		'context-servers': 'MCP',
		'agent-servers': 'Agent',
		'slash-commands': 'Slash Cmd',
		'indexed-docs-providers': 'Docs',
		snippets: 'Snippets',
		'debug-adapters': 'Debug'
	};

	const s = $derived(
		styles[provide] ?? {
			bg: 'bg-zinc-50 dark:bg-zinc-900',
			text: 'text-zinc-600 dark:text-zinc-400',
			dot: 'bg-zinc-400'
		}
	);
</script>

<span
	class={cn(
		'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium tracking-wide uppercase',
		s.bg,
		s.text,
		className
	)}
>
	<span class={cn('h-1.5 w-1.5 rounded-full', s.dot)}></span>
	{label[provide] ?? provide}
</span>
