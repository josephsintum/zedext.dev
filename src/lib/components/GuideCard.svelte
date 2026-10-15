<script lang="ts">
	import type { GuideList } from '$lib/guides.js';
	import type { ExtensionRecord } from '$lib/types.js';
	import { formatNumber } from '$lib/utils/format.js';

	let { list, items, total }: { list: GuideList; items: ExtensionRecord[]; total: number } =
		$props();
</script>

<div
	class="flex h-full flex-col rounded-lg border border-border bg-surface-raised p-4 hover:border-border-hover"
>
	<div class="flex gap-2.5">
		<span class="text-[22px] leading-tight" aria-hidden="true">{list.emoji}</span>
		<div class="min-w-0">
			<h3 id="c-{list.slug}" class="scroll-mt-20 text-15 font-semibold text-text">
				<a href="/guides/{list.slug}" class="hover:text-accent-hover">{list.title}</a>
			</h3>
			<p class="text-13 text-text-secondary">{list.description}</p>
		</div>
	</div>

	{#if list.builtIn}
		<p class="mt-2.5 text-12 text-text-tertiary">
			<span class="font-medium text-emerald-700 dark:text-emerald-400">Built in:</span>
			{list.builtIn.join(' · ')}
		</p>
	{/if}

	<ul class="mt-2 mb-3 border-t border-border">
		{#each items as hit (hit.id)}
			<li>
				<a
					href="/extensions/{hit.id}"
					class="group flex justify-between gap-2 border-b border-border px-0.5 py-1.5 text-13"
				>
					<span class="truncate font-mono text-[12.5px] text-text group-hover:text-accent-hover"
						>{hit.name}</span
					>
					<span class="shrink-0 text-12 text-text-tertiary tabular-nums"
						>↓ {formatNumber(hit.download_count)}</span
					>
				</a>
			</li>
		{/each}
	</ul>

	<a href="/guides/{list.slug}" class="mt-auto text-13 text-accent">See all {total} →</a>
</div>
