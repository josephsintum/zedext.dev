<script lang="ts">
	import { countOf } from '$lib/utils/format.js';
	import ExtensionCard from '$lib/components/ExtensionCard.svelte';
	import Seo from '$lib/components/Seo.svelte';
	import GuideSections from '$lib/components/GuideSections.svelte';

	let { data } = $props();
</script>

<Seo
	title="{data.list.title} for Zed — ZedExt"
	description={data.list.description}
	path="/guides/{data.list.slug}"
	ogTitle="{data.list.emoji} {data.list.title}"
/>

<div class="mx-auto max-w-6xl px-6 py-10">
	<nav aria-label="Breadcrumb" class="text-text-tertiary text-12 mb-3">
		<a href="/#guides" class="hover:text-text">Guides</a>
		<span aria-hidden="true">›</span>
		<span aria-current="page">{data.list.title}</span>
	</nav>
	<h1 class="text-text text-3xl font-bold tracking-tight">
		<span aria-hidden="true">{data.list.emoji}</span>
		{data.list.title}
	</h1>
	<p class="text-text-secondary text-15 mt-2 max-w-3xl">
		{data.guide?.intro ?? data.list.description}
	</p>

	{#if data.list.builtIn}
		<section
			class="mt-6 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-5"
			class:max-w-3xl={data.guide && data.guide.groups.length > 0}
		>
			<h2 class="text-text text-14 font-semibold">✓ Built into Zed, no extension needed</h2>
			<ul class="text-text-secondary text-13 mt-2 list-disc space-y-1 pl-5">
				{#each data.list.builtIn as item (item)}
					<li>{item}</li>
				{/each}
			</ul>
		</section>
	{/if}

	{#if data.total > 0}
		<p class="text-text-tertiary text-13 mt-1">
			{countOf(data.total, 'extension')}{data.total > data.items.length
				? ` · showing the top ${data.items.length}`
				: ''}
		</p>
	{/if}
	{#if data.guide && data.guide.groups.length > 0}
		<div class="max-w-3xl">
			<GuideSections guide={data.guide} />
		</div>
	{:else if data.items.length > 0}
		<div class="mt-8 grid auto-rows-fr grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
			{#each data.items as hit (hit.id)}
				<ExtensionCard {hit} />
			{/each}
		</div>
	{:else}
		<p class="text-text-tertiary text-14 mt-8">These extensions are temporarily unavailable.</p>
	{/if}

	{#if data.browseAll && data.total > data.items.length}
		<a href={data.browseAll.href} class="text-accent text-13 mt-6 inline-block"
			>Browse all {data.browseAll.label} →</a
		>
	{/if}
</div>
