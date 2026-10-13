<script lang="ts">
	import ExtensionCard from '$lib/components/ExtensionCard.svelte';
	import Seo from '$lib/components/Seo.svelte';

	let { data } = $props();
	const name = $derived(data.extension.name);
</script>

<Seo
	title="Alternatives to {name} for Zed — ZedExt"
	description="Zed extensions similar to {name}: {data.alternatives
		.slice(0, 3)
		.map((a) => a.name)
		.join(', ')} and more, ranked by relevance and downloads."
	path="/extensions/{data.extension.id}/alternatives"
	ogTitle="Alternatives to {name}"
	noindex={!data.indexable}
/>

<div class="mx-auto max-w-6xl px-6 py-10">
	<nav class="mb-3 text-[12px] text-[var(--color-text-tertiary)]">
		<a href="/extensions/{data.extension.id}" class="hover:text-[var(--color-text)]">{name}</a> › Alternatives
	</nav>
	<h1 class="text-3xl font-bold tracking-tight text-[var(--color-text)]">Alternatives to {name}</h1>
	<p class="mt-2 max-w-2xl text-[15px] text-[var(--color-text-secondary)]">
		Zed extensions that do something similar to
		<a href="/extensions/{data.extension.id}" class="text-[var(--color-accent)] hover:underline"
			>{name}</a
		>.
	</p>
	{#if data.alternatives.length > 0}
		<div
			class="mt-8 grid auto-rows-fr grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
		>
			{#each data.alternatives as hit (hit.id)}
				<ExtensionCard {hit} />
			{/each}
		</div>
	{:else}
		<p class="mt-8 text-[14px] text-[var(--color-text-tertiary)]">
			No similar extensions found yet.
		</p>
	{/if}
</div>
