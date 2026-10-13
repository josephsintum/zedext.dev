<script lang="ts">
	import ExtensionCard from '$lib/components/ExtensionCard.svelte';
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
		<a href="/collections" class="hover:text-[var(--color-text)]">Collections</a> › {data.collection
			.title}
	</nav>
	<h1 class="text-3xl font-bold tracking-tight text-[var(--color-text)]">
		{data.collection.emoji}
		{data.collection.title}
	</h1>
	<p class="mt-2 max-w-2xl text-[15px] text-[var(--color-text-secondary)]">
		{data.collection.description}
	</p>

	{#if data.items.length > 0}
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
</div>
