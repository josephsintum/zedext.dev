<script lang="ts">
	import type { BuiltGuide } from '$lib/guide-content.js';
	import { formatNumber } from '$lib/utils/format.js';

	let { guide }: { guide: BuiltGuide } = $props();

	const anchor = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
</script>

<nav class="mt-6 flex flex-wrap gap-1.5" aria-label="Groups">
	{#each guide.groups as group (group.title)}
		<a
			href="#{anchor(group.title)}"
			class="border-border text-text-secondary hover:border-border-hover text-12 rounded-full border px-2.5 py-1"
			>{group.title}</a
		>
	{/each}
	{#if guide.rest.length > 0}
		<a
			href="#everything-else"
			onclick={() => document.getElementById('everything-else')?.setAttribute('open', '')}
			class="border-border text-text-secondary hover:border-border-hover text-12 rounded-full border px-2.5 py-1"
			>Everything else</a
		>
	{/if}
</nav>

{#each guide.groups as group (group.title)}
	<section class="mt-9">
		<h2 id={anchor(group.title)} class="text-text scroll-mt-20 text-[18px] font-semibold">
			{group.title}
		</h2>
		<p class="text-text-secondary text-14 mt-1 mb-3">{group.blurb}</p>
		<ul
			class="bg-surface-raised divide-border border-border divide-y overflow-hidden rounded-lg border"
		>
			{#each group.picks as pick (pick.record.id)}
				<li>
					<a
						href="/extensions/{pick.record.id}"
						class="group hover:bg-surface-hover flex items-center justify-between gap-3 px-3.5 py-2.5"
					>
						<span class="min-w-0">
							<span
								class="text-text group-hover:text-accent-hover text-13 block truncate font-mono font-semibold"
								>{pick.record.name}</span
							>
							<span class="text-text-secondary text-13 block">{pick.why}</span>
						</span>
						<span class="text-text-tertiary text-12 shrink-0 tabular-nums"
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
		class="bg-surface-raised border-border mt-9 scroll-mt-20 rounded-lg border px-3.5 py-3"
	>
		<summary class="text-text text-14 cursor-pointer font-semibold">
			Everything else · {guide.rest.length} more, by downloads
		</summary>
		<ul class="mt-2 gap-x-7 sm:columns-2">
			{#each guide.rest as r (r.id)}
				<li class="break-inside-avoid">
					<a
						href="/extensions/{r.id}"
						class="group border-border text-13 flex justify-between gap-2 border-b py-1.5"
					>
						<span class="text-text group-hover:text-accent-hover truncate font-mono text-[12.5px]"
							>{r.name}</span
						>
						<span class="text-text-tertiary text-12 shrink-0 tabular-nums"
							>↓ {formatNumber(r.download_count)}</span
						>
					</a>
				</li>
			{/each}
		</ul>
	</details>
{/if}
