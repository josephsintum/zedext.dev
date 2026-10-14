<script lang="ts">
	import ExtensionCard from '$lib/components/ExtensionCard.svelte';
	import ThemeTile from '$lib/components/ThemeTile.svelte';
	import Seo from '$lib/components/Seo.svelte';
	import WorkflowGuide from '$lib/components/WorkflowGuide.svelte';

	let { data } = $props();
</script>

<Seo
	title="{data.list.title} for Zed — ZedExt"
	description={data.list.description}
	path="/discover/{data.list.slug}"
	ogTitle="{data.list.emoji} {data.list.title}"
/>

<div class="mx-auto max-w-6xl px-6 py-10">
	<nav class="mb-3 text-[12px] text-[var(--color-text-tertiary)]">
		<a href="/discover" class="hover:text-[var(--color-text)]">Discover</a> › {data.list.title}
	</nav>
	<h1 class="text-3xl font-bold tracking-tight text-[var(--color-text)]">
		{data.list.emoji}
		{data.list.title}
	</h1>
	<p class="mt-2 max-w-3xl text-[15px] text-[var(--color-text-secondary)]">
		{data.guide?.intro ?? data.list.description}
	</p>

	{#if data.list.builtIn}
		<section
			class="mt-6 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-5"
			class:max-w-3xl={data.guide && data.guide.groups.length > 0}
		>
			<h2 class="text-[14px] font-semibold text-[var(--color-text)]">
				✓ Built into Zed, no extension needed
			</h2>
			<ul class="mt-2 list-disc space-y-1 pl-5 text-[13px] text-[var(--color-text-secondary)]">
				{#each data.list.builtIn as item (item)}
					<li>{item}</li>
				{/each}
			</ul>
		</section>
	{/if}

	{#if data.total > 0}
		<p class="mt-1 text-[13px] text-[var(--color-text-tertiary)]">
			{data.total} extensions{data.total > data.items.length
				? ` · showing the top ${data.items.length}`
				: ''}
		</p>
	{/if}
	{#if data.guide && data.guide.groups.length > 0}
		<div class="max-w-3xl">
			<WorkflowGuide guide={data.guide} />
		</div>
	{:else if data.tiles && data.tiles.length > 0}
		<div class="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
			{#each data.tiles as tile (tile.record.id)}
				<ThemeTile {tile} />
			{/each}
		</div>
	{:else if !data.tiles && data.items.length > 0}
		<div class="mt-8 grid auto-rows-fr grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
			{#each data.items as hit (hit.id)}
				<ExtensionCard {hit} />
			{/each}
		</div>
	{:else}
		<p class="mt-8 text-[14px] text-[var(--color-text-tertiary)]">
			These extensions are temporarily unavailable.
		</p>
	{/if}

	{#if data.browseAll && data.total > data.items.length}
		<a href={data.browseAll.href} class="mt-6 inline-block text-[13px] text-[var(--color-accent)]"
			>Browse all {data.browseAll.label} →</a
		>
	{/if}
</div>
