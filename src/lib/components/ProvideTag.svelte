<script lang="ts">
	import { cn } from '$lib/utils.js';

	let { provide, class: className }: { provide: string; class?: string } = $props();

	const styles: Record<string, { bg: string; text: string; dot: string }> = {
		themes: { bg: 'bg-violet-50', text: 'text-violet-600', dot: 'bg-violet-400' },
		'icon-themes': { bg: 'bg-fuchsia-50', text: 'text-fuchsia-600', dot: 'bg-fuchsia-400' },
		languages: { bg: 'bg-sky-50', text: 'text-sky-600', dot: 'bg-sky-400' },
		grammars: { bg: 'bg-cyan-50', text: 'text-cyan-600', dot: 'bg-cyan-400' },
		'language-servers': { bg: 'bg-emerald-50', text: 'text-emerald-600', dot: 'bg-emerald-400' },
		'context-servers': { bg: 'bg-orange-50', text: 'text-orange-600', dot: 'bg-orange-400' },
		'agent-servers': { bg: 'bg-amber-50', text: 'text-amber-600', dot: 'bg-amber-400' },
		'debug-adapters': { bg: 'bg-rose-50', text: 'text-rose-600', dot: 'bg-rose-400' },
		snippets: { bg: 'bg-teal-50', text: 'text-teal-600', dot: 'bg-teal-400' }
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
		styles[provide] ?? { bg: 'bg-zinc-50', text: 'text-zinc-600', dot: 'bg-zinc-400' }
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
