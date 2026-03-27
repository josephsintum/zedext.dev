<script lang="ts">
	import type { ExtensionHit } from '$lib/types.js';
	import { formatNumber } from '$lib/utils/format.js';
	import { timeAgo } from '$lib/utils/format.js';
	import ProvideTag from './ProvideTag.svelte';

	let { hit, index = 0 }: { hit: ExtensionHit; index?: number } = $props();

	const primaryProvides = $derived(
		hit.provides.filter(
			(p) => !['grammars', 'slash-commands', 'indexed-docs-providers'].includes(p)
		)
	);

	const borderColor: Record<string, string> = {
		themes: 'group-hover:border-l-violet-400',
		'icon-themes': 'group-hover:border-l-fuchsia-400',
		languages: 'group-hover:border-l-sky-400',
		'language-servers': 'group-hover:border-l-emerald-400',
		'context-servers': 'group-hover:border-l-orange-400',
		'agent-servers': 'group-hover:border-l-amber-400',
		'debug-adapters': 'group-hover:border-l-rose-400',
		snippets: 'group-hover:border-l-teal-400'
	};

	const accentBorder = $derived(
		primaryProvides.length > 0
			? (borderColor[primaryProvides[0]] ?? 'group-hover:border-l-zinc-400')
			: 'group-hover:border-l-zinc-400'
	);
</script>

<a
	href="/extensions/{hit.objectID}"
	class="card-hover group bg-surface-raised flex min-w-0 flex-col overflow-hidden rounded-lg border border-[var(--color-border)] p-4 {accentBorder}"
	style="animation-delay: {index * 30}ms"
>
	<div class="mb-1.5 flex items-start justify-between gap-2">
		<h3
			class="min-w-0 truncate font-mono text-[14px] font-semibold text-[var(--color-text)] group-hover:text-[var(--color-accent-hover)]"
		>
			{hit.name}
		</h3>
		<span
			class="shrink-0 rounded-md bg-[var(--color-surface)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--color-text-tertiary)]"
		>
			v{hit.version}
		</span>
	</div>

	{#if hit.description}
		<p
			class="mb-3 line-clamp-2 min-w-0 text-[13px] leading-relaxed text-[var(--color-text-secondary)]"
		>
			{hit.description}
		</p>
	{:else}
		<div class="mb-3"></div>
	{/if}

	<div class="mt-auto flex flex-wrap gap-1">
		{#each primaryProvides.slice(0, 2) as provide}
			<ProvideTag {provide} />
		{/each}
	</div>

	<div
		class="mt-3 flex items-center gap-3 border-t border-[var(--color-border)] pt-3 text-[12px] text-[var(--color-text-tertiary)]"
	>
		<!-- Downloads -->
		<span class="flex items-center gap-1 tabular-nums">
			<svg
				class="h-3.5 w-3.5"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
				stroke-width="1.5"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
				/>
			</svg>
			{formatNumber(hit.download_count)}
		</span>

		<!-- Stars -->
		{#if hit.github_stars > 0}
			<span class="flex items-center gap-1 tabular-nums">
				<svg
					class="h-3.5 w-3.5"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
					stroke-width="1.5"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
					/>
				</svg>
				{formatNumber(hit.github_stars)}
			</span>
		{/if}

		<span class="ml-auto truncate text-[11px]">
			{hit.authors[0] ?? 'Unknown'}
		</span>
	</div>
</a>
