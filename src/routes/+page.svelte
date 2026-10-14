<script lang="ts">
	import ExtensionCard from '$lib/components/ExtensionCard.svelte';
	import ThemePaletteCard from '$lib/components/ThemePaletteCard.svelte';
	import { themeHref } from '$lib/theme-picker.js';
	import GuideCard from '$lib/components/GuideCard.svelte';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import HubCard from '$lib/components/HubCard.svelte';
	import Seo from '$lib/components/Seo.svelte';
	import { timeAgo } from '$lib/utils/format.js';
	import type { ExtensionRecord } from '$lib/types.js';

	let { data } = $props();

	const jumps = $derived([
		...(data.newest.length > 0 ? [{ id: 'new', label: 'New' }] : []),
		...(data.themes.length > 0 ? [{ id: 'themes', label: 'Themes' }] : []),
		...(data.guides.length > 0 ? [{ id: 'guides', label: 'Guides' }] : []),
		...(data.updated.length > 0 ? [{ id: 'updated', label: 'Updated' }] : []),
		{ id: 'languages', label: 'Languages' }
	]);
</script>

<Seo
	title="ZedExt — Discover Zed Extensions"
	description="Find extensions for the Zed editor: what’s new, theme previews, setup guides for AI agents, VS Code and Vim users, web frontend, DevOps and writing, and the best extensions for each language."
	path=""
	ogTitle="ZedExt"
/>

<!-- Phones: one swipeable row (the next card peeks in) instead of four stacked cards.
	 The vertical padding keeps the cards' hover lift and focus ring from being clipped -->
{#snippet cardRow(hits: ExtensionRecord[], note: (hit: ExtensionRecord) => string)}
	<div
		class="-mx-6 -my-2 flex snap-x snap-mandatory scroll-px-6 gap-3 overflow-x-auto px-6 py-2 sm:mx-0 sm:my-0 sm:grid sm:auto-rows-fr sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:py-0 lg:grid-cols-4"
	>
		{#each hits as hit (hit.id)}
			<div class="w-[80%] shrink-0 snap-start sm:w-auto">
				<ExtensionCard {hit} note={note(hit)} />
			</div>
		{/each}
	</div>
{/snippet}

{#snippet heading(id: string, title: string, sub: string, href = '', more = '')}
	<div class="mb-3 flex items-end justify-between gap-4">
		<div>
			<h2 {id} class="scroll-mt-20 text-[18px] font-semibold text-[var(--color-text)]">{title}</h2>
			<p class="text-[13px] text-[var(--color-text-tertiary)]">{sub}</p>
		</div>
		{#if href && more}
			<a {href} class="shrink-0 text-[13px] text-[var(--color-accent)]">{more} →</a>
		{/if}
	</div>
{/snippet}

<div class="mx-auto max-w-6xl px-6 pt-12 pb-20">
	<div class="text-center">
		<h1 class="text-4xl font-bold tracking-tight text-balance text-[var(--color-text)]">
			Extensions for <span class="font-mono text-[var(--color-accent)]">Zed</span>
		</h1>
		<p class="mt-3 text-[15px] text-[var(--color-text-secondary)]">
			What’s new, theme previews, setup guides, and the best extensions for each language.
		</p>
		<div class="mx-auto mt-6 max-w-2xl">
			<SearchBar to="/extensions" totalHits={data.extensionCount} />
		</div>
		<nav class="mt-5 flex flex-wrap justify-center gap-1.5" aria-label="Sections">
			{#each jumps as j (j.id)}
				<a
					href="#{j.id}"
					class="rounded-full border border-[var(--color-border)] px-2.5 py-1 text-[12px] text-[var(--color-text-secondary)] hover:border-[var(--color-border-hover)]"
					>{j.label}</a
				>
			{/each}
			<a
				href="/extensions"
				class="rounded-full border border-[var(--color-border)] px-2.5 py-1 text-[12px] text-[var(--color-accent)] hover:border-[var(--color-border-hover)]"
				>All extensions →</a
			>
		</nav>
	</div>

	{#if data.newest.length > 0}
		<section class="mt-10">
			{@render heading('new', 'New', 'Just added to the registry · themes have their own section')}
			{@render cardRow(data.newest, (hit) => `Added ${timeAgo(hit.first_published_at!)}`)}
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

	{#if data.guides.length > 0}
		<section class="mt-10">
			{@render heading(
				'guides',
				'Guides',
				'Set Zed up for how you work: what’s built in, then the extensions that add more'
			)}
			<div class="grid auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
				{#each data.guides as guide (guide.list.slug)}
					<GuideCard list={guide.list} items={guide.items} total={guide.total} />
				{/each}
			</div>
		</section>
	{/if}

	{#if data.updated.length > 0}
		<section class="mt-10">
			{@render heading(
				'updated',
				'Recently updated',
				'Fresh releases of popular extensions',
				'/extensions?sort=updated',
				'See all'
			)}
			{@render cardRow(data.updated, (hit) => `Updated ${timeAgo(hit.published_at)}`)}
		</section>
	{/if}

	<section class="mt-14 border-t border-[var(--color-border)] pt-8">
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

	<div class="mt-14 text-center">
		<a
			href="/extensions"
			class="inline-block rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 py-2.5 text-[14px] font-medium text-[var(--color-text)] hover:border-[var(--color-border-hover)]"
		>
			Browse all {data.extensionCount.toLocaleString('en-US')} extensions →
		</a>
	</div>
</div>
