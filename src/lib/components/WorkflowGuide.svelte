<script lang="ts">
	import type { BuiltGuide } from '$lib/discover-guides.js';
	import { formatNumber } from '$lib/utils/format.js';

	let { guide }: { guide: BuiltGuide } = $props();

	const anchor = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
</script>

<nav class="mt-6 flex flex-wrap gap-1.5" aria-label="Groups">
	{#each guide.groups as group (group.title)}
		<a
			href="#{anchor(group.title)}"
			class="rounded-full border border-[var(--color-border)] px-2.5 py-1 text-[12px] text-[var(--color-text-secondary)] hover:border-[var(--color-border-hover)]"
			>{group.title}</a
		>
	{/each}
	{#if guide.rest.length > 0}
		<a
			href="#everything-else"
			onclick={() => document.getElementById('everything-else')?.setAttribute('open', '')}
			class="rounded-full border border-[var(--color-border)] px-2.5 py-1 text-[12px] text-[var(--color-text-secondary)] hover:border-[var(--color-border-hover)]"
			>Everything else</a
		>
	{/if}
</nav>

{#each guide.groups as group (group.title)}
	<section class="mt-9">
		<h2
			id={anchor(group.title)}
			class="scroll-mt-20 text-[18px] font-semibold text-[var(--color-text)]"
		>
			{group.title}
		</h2>
		<p class="mt-1 mb-3 text-[14px] text-[var(--color-text-secondary)]">{group.blurb}</p>
		<ul
			class="bg-surface-raised divide-y divide-[var(--color-border)] overflow-hidden rounded-lg border border-[var(--color-border)]"
		>
			{#each group.picks as pick (pick.record.id)}
				<li>
					<a
						href="/extensions/{pick.record.id}"
						class="group flex items-center justify-between gap-3 px-3.5 py-2.5 hover:bg-[var(--color-surface-hover)]"
					>
						<span class="min-w-0">
							<span
								class="block truncate font-mono text-[13px] font-semibold text-[var(--color-text)] group-hover:text-[var(--color-accent-hover)]"
								>{pick.record.name}</span
							>
							<span class="block text-[13px] text-[var(--color-text-secondary)]">{pick.why}</span>
						</span>
						<span class="shrink-0 text-[12px] text-[var(--color-text-tertiary)] tabular-nums"
							>↓ {formatNumber(pick.record.download_count)}</span
						>
					</a>
				</li>
			{/each}
		</ul>
	</section>
{/each}

{#if guide.rest.length > 0}
	<details
		id="everything-else"
		class="bg-surface-raised mt-9 scroll-mt-20 rounded-lg border border-[var(--color-border)] px-3.5 py-3"
	>
		<summary class="cursor-pointer text-[14px] font-semibold text-[var(--color-text)]">
			Everything else · {guide.rest.length} more, by downloads
		</summary>
		<ul class="mt-2 gap-x-7 sm:columns-2">
			{#each guide.rest as r (r.id)}
				<li class="break-inside-avoid">
					<a
						href="/extensions/{r.id}"
						class="group flex justify-between gap-2 border-b border-[var(--color-border)] py-1.5 text-[13px]"
					>
						<span
							class="truncate font-mono text-[12.5px] text-[var(--color-text)] group-hover:text-[var(--color-accent-hover)]"
							>{r.name}</span
						>
						<span class="shrink-0 text-[12px] text-[var(--color-text-tertiary)] tabular-nums"
							>↓ {formatNumber(r.download_count)}</span
						>
					</a>
				</li>
			{/each}
		</ul>
	</details>
{/if}
