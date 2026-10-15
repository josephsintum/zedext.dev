<script lang="ts">
	import type { GuideList } from '$lib/guides.js';
	import type { ExtensionRecord } from '$lib/types.js';
	import { formatNumber } from '$lib/utils/format.js';

	let { list, items, total }: { list: GuideList; items: ExtensionRecord[]; total: number } =
		$props();
</script>

<div
	class="bg-surface-raised border-border hover:border-border-hover flex h-full flex-col rounded-lg border p-4"
>
	<div class="flex gap-2.5">
		<span class="text-[22px] leading-tight" aria-hidden="true">{list.emoji}</span>
		<div class="min-w-0">
			<h3 id="c-{list.slug}" class="text-text text-15 scroll-mt-20 font-semibold">
				<a href="/guides/{list.slug}" class="hover:text-accent-hover">{list.title}</a>
			</h3>
			<p class="text-text-secondary text-13">{list.description}</p>
		</div>
	</div>

	{#if list.builtIn}
		<p class="text-text-tertiary text-12 mt-2.5">
			<span class="font-medium text-emerald-700 dark:text-emerald-400">Built in:</span>
			{list.builtIn.join(' · ')}
		</p>
	{/if}

	<ul class="border-border mt-2 mb-3 border-t">
		{#each items as hit (hit.id)}
			<li>
				<a
					href="/extensions/{hit.id}"
					class="group border-border text-13 flex justify-between gap-2 border-b px-0.5 py-1.5"
				>
					<span class="text-text group-hover:text-accent-hover truncate font-mono text-[12.5px]"
						>{hit.name}</span
					>
					<span class="text-text-tertiary text-12 shrink-0 tabular-nums"
						>↓ {formatNumber(hit.download_count)}</span
					>
				</a>
			</li>
		{/each}
	</ul>

	<a href="/guides/{list.slug}" class="text-accent text-13 mt-auto">See all {total} →</a>
</div>
