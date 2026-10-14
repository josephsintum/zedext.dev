<script lang="ts">
	import type { DiscoverList } from '$lib/discover.js';
	import type { ExtensionRecord } from '$lib/types.js';
	import { formatNumber } from '$lib/utils/format.js';

	let { list, items, total }: { list: DiscoverList; items: ExtensionRecord[]; total: number } =
		$props();
</script>

<div
	class="bg-surface-raised flex h-full flex-col rounded-lg border border-[var(--color-border)] p-4 hover:border-[var(--color-border-hover)]"
>
	<div class="flex gap-2.5">
		<span class="text-[22px] leading-tight" aria-hidden="true">{list.emoji}</span>
		<div class="min-w-0">
			<h3
				id="c-{list.slug}"
				class="scroll-mt-20 text-[15px] font-semibold text-[var(--color-text)]"
			>
				<a href="/discover/{list.slug}" class="hover:text-[var(--color-accent-hover)]"
					>{list.title}</a
				>
			</h3>
			<p class="text-[13px] text-[var(--color-text-secondary)]">{list.description}</p>
		</div>
	</div>

	{#if list.builtIn}
		<p class="mt-2.5 text-[12px] text-[var(--color-text-tertiary)]">
			<span class="font-medium text-emerald-700 dark:text-emerald-400">Built in:</span>
			{list.builtIn.join(' · ')}
		</p>
	{/if}

	<ul class="mt-2 mb-3 border-t border-[var(--color-border)]">
		{#each items as hit (hit.id)}
			<li>
				<a
					href="/extensions/{hit.id}"
					class="group flex justify-between gap-2 border-b border-[var(--color-border)] px-0.5 py-1.5 text-[13px]"
				>
					<span
						class="truncate font-mono text-[12.5px] text-[var(--color-text)] group-hover:text-[var(--color-accent-hover)]"
						>{hit.name}</span
					>
					<span class="shrink-0 text-[12px] text-[var(--color-text-tertiary)] tabular-nums"
						>↓ {formatNumber(hit.download_count)}</span
					>
				</a>
			</li>
		{/each}
	</ul>

	<a href="/discover/{list.slug}" class="mt-auto text-[13px] text-[var(--color-accent)]"
		>See all {total} →</a
	>
</div>
