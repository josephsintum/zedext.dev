<script lang="ts">
	import CardCarousel from '$lib/components/CardCarousel.svelte';
	import ThemePaletteCard from '$lib/components/ThemePaletteCard.svelte';
	import { themeHref } from '$lib/theme-picker.js';
	import GuideCard from '$lib/components/GuideCard.svelte';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import HubCard from '$lib/components/HubCard.svelte';
	import Seo from '$lib/components/Seo.svelte';

	let { data } = $props();
</script>

<Seo
	title="ZedExt — Discover Zed Extensions"
	description="Find extensions for the Zed editor: featured and most popular, theme previews, setup guides for AI agents, VS Code and Vim users, web frontend, DevOps and writing, and the best extensions for each language."
	path=""
	ogTitle="ZedExt"
/>

{#snippet heading(id: string, title: string, sub: string, href = '', more = '')}
	<div class="mb-3 flex items-end justify-between gap-4">
		<div>
			<h2 {id} class="scroll-mt-20 text-[18px] font-semibold text-text">{title}</h2>
			<p class="text-13 text-text-tertiary">{sub}</p>
		</div>
		{#if href && more}
			<a {href} class="shrink-0 text-13 text-accent">{more} →</a>
		{/if}
	</div>
{/snippet}

<div class="mx-auto max-w-6xl px-6 pt-12 pb-20">
	<div class="text-center">
		<h1 class="text-4xl font-bold tracking-tight text-balance text-text">Extensions for Zed</h1>
		<p class="mt-3 text-15 text-text-secondary">
			Every extension in Zed’s registry, ranked by downloads, with theme previews and setup guides.
			Updated nightly.
		</p>
		<div class="mx-auto mt-6 max-w-2xl">
			<SearchBar to="/extensions" totalHits={data.extensionCount} />
		</div>
	</div>

	{#if data.featured.length > 0}
		<section class="mt-10">
			{@render heading('featured', 'Featured', 'Hand-picked extensions worth a look')}
			<CardCarousel hits={data.featured} label="featured extensions" />
		</section>
	{/if}

	{#if data.themes.length > 0}
		<section class="mt-10">
			{@render heading(
				'themes',
				'Themes',
				'Pick one to preview it, then switch between dark and light',
				'/themes',
				'Browse all themes'
			)}
			<div class="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
				{#each data.themes as entry (entry.id)}
					<ThemePaletteCard {entry} href={themeHref(entry.id, 'dark')} />
				{/each}
			</div>
		</section>
	{/if}

	<section class="mt-10">
		{@render heading(
			'popular',
			'Most popular',
			'The most downloaded extensions',
			'/extensions',
			'See all'
		)}
		<CardCarousel hits={data.popular} label="popular extensions" />
	</section>

	<section class="mt-10">
		{@render heading(
			'languages',
			'Languages',
			'What’s built in, and the extensions that add more',
			'/languages',
			'All languages'
		)}
		<div class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
			{#each data.hubs as hub (hub.slug)}
				<HubCard {hub} />
			{/each}
		</div>
	</section>

	{#if data.guides.length > 0}
		<section class="mt-10">
			{@render heading('guides', 'Guides', 'Set Zed up for how you work')}
			<div class="grid auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
				{#each data.guides as guide (guide.list.slug)}
					<GuideCard list={guide.list} items={guide.items} total={guide.total} />
				{/each}
			</div>
		</section>
	{/if}

	<div class="mt-14 text-center">
		<a
			href="/extensions"
			class="inline-block rounded-lg border border-border bg-surface-raised px-4 py-2.5 text-14 font-medium text-text hover:border-border-hover"
		>
			Browse all {data.extensionCount.toLocaleString('en-US')} extensions →
		</a>
	</div>
</div>
