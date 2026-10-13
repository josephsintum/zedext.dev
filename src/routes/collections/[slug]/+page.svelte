<script lang="ts">
	import ExtensionCard from '$lib/components/ExtensionCard.svelte';
	import ThemeTile from '$lib/components/ThemeTile.svelte';
	import Seo from '$lib/components/Seo.svelte';

	let { data } = $props();
</script>

<Seo
	title="{data.collection.title} for Zed — ZedExt"
	description={data.collection.description}
	path="/collections/{data.collection.slug}"
	ogTitle="{data.collection.emoji} {data.collection.title}"
/>

<div class="mx-auto max-w-6xl px-6 py-10">
	<nav class="mb-3 text-[12px] text-[var(--color-text-tertiary)]">
		<a href="/collections" class="hover:text-[var(--color-text)]">Discover</a> › {data.collection
			.title}
	</nav>
	<h1 class="text-3xl font-bold tracking-tight text-[var(--color-text)]">
		{data.collection.emoji}
		{data.collection.title}
	</h1>
	<p class="mt-2 max-w-2xl text-[15px] text-[var(--color-text-secondary)]">
		{data.collection.description}
	</p>

	{#if data.total > 0}
		<p class="mt-1 text-[13px] text-[var(--color-text-tertiary)]">
			{data.total} extensions{data.total > data.items.length
				? ` · showing the top ${data.items.length}`
				: ''}
		</p>
	{/if}
	{#if data.tiles && data.tiles.length > 0}
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
		<a href={data.browseAll} class="mt-6 inline-block text-[13px] text-[var(--color-accent)]"
			>Browse all {data.collection.match.appearance ? 'themes' : data.collection.title} →</a
		>
	{/if}
</div>
