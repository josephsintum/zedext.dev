<script lang="ts">
	import { page } from '$app/state';
	import { searchExtensions } from '$lib/search/algolia.js';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import CategoryTabs from '$lib/components/CategoryTabs.svelte';
	import SortSelect from '$lib/components/SortSelect.svelte';
	import ExtensionCard from '$lib/components/ExtensionCard.svelte';
	import Pagination from '$lib/components/Pagination.svelte';
	import { formatNumber } from '$lib/utils/format.js';
	import type { SearchResults } from '$lib/types.js';

	let { data } = $props();

	let query = $derived(page.url.searchParams.get('q') ?? '');
	let category = $derived(page.url.searchParams.get('category') ?? 'all');
	let sort = $derived(page.url.searchParams.get('sort') ?? 'downloads');
	let currentPage = $derived(Math.max(0, Number(page.url.searchParams.get('page') ?? 1) - 1));

	let results: SearchResults | null = $state(null);
	let loading = $state(false);

	$effect(() => {
		const q = query;
		const cat = category;
		const s = sort;
		const p = currentPage;

		loading = true;
		searchExtensions(q, { category: cat, sort: s, page: p }).then((r) => {
			results = r;
			loading = false;
		});
	});

	const displayResults = $derived(results ?? data.initialResults);
</script>

<svelte:head>
	<title>ZedExt — Discover Zed Extensions</title>
	<meta name="description" content="The best way to discover, search, and explore extensions for the Zed editor. Rich detail pages with README, GitHub stats, and version history." />
</svelte:head>

<!-- Hero with dot grid background -->
<section class="dot-grid border-b border-[var(--color-border)]">
	<div class="mx-auto max-w-7xl px-6 pb-10 pt-16">
		<div class="mx-auto max-w-2xl text-center">
			<h1 class="text-4xl font-bold tracking-tight text-[var(--color-text)]">
				Extensions for <span class="font-mono text-[var(--color-accent)]">Zed</span>
			</h1>
			<p class="mt-3 text-[15px] leading-relaxed text-[var(--color-text-secondary)]">
				Browse the full Zed extension registry with rich detail pages,
				GitHub stats, and instant search.
			</p>
		</div>

		<div class="mx-auto mt-8 max-w-xl">
			<SearchBar value={query} />
		</div>
	</div>
</section>

<!-- Main content -->
<section class="mx-auto max-w-7xl px-6 py-8">
	<!-- Toolbar: category tabs + sort + count -->
	<div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<CategoryTabs active={category} facets={displayResults.facets?.provides ?? {}} />
		<div class="flex items-center gap-3">
			{#if displayResults.nbHits > 0}
				<span class="text-[13px] tabular-nums text-[var(--color-text-tertiary)]">
					{formatNumber(displayResults.nbHits)} results
				</span>
			{/if}
			<SortSelect value={sort} />
		</div>
	</div>

	<!-- Extension grid -->
	<div
		class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
		class:opacity-40={loading}
		class:pointer-events-none={loading}
		style="transition: opacity 0.15s ease"
	>
		{#each displayResults.hits as hit, i (hit.objectID)}
			<div class="animate-fade-up min-w-0" style="animation-delay: {i * 25}ms">
				<ExtensionCard {hit} index={i} />
			</div>
		{/each}
	</div>

	<!-- Empty state -->
	{#if displayResults.hits.length === 0 && !loading}
		<div class="flex flex-col items-center py-24">
			<div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-surface-hover)]">
				<svg class="h-8 w-8 text-[var(--color-text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
					<path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
				</svg>
			</div>
			<p class="mt-4 text-[15px] font-medium text-[var(--color-text-secondary)]">No extensions found</p>
			{#if query}
				<p class="mt-1.5 text-[13px] text-[var(--color-text-tertiary)]">
					No results for "<span class="font-mono">{query}</span>". Try a different search term.
				</p>
			{/if}
		</div>
	{/if}

	<!-- Loading shimmer -->
	{#if loading && displayResults.hits.length === 0}
		<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{#each Array(12) as _, i}
				<div class="animate-pulse rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4" style="animation-delay: {i * 50}ms">
					<div class="mb-2 flex justify-between">
						<div class="h-4 w-24 rounded bg-[var(--color-surface-hover)]"></div>
						<div class="h-4 w-12 rounded bg-[var(--color-surface-hover)]"></div>
					</div>
					<div class="mb-3 space-y-1.5">
						<div class="h-3 w-full rounded bg-[var(--color-surface-hover)]"></div>
						<div class="h-3 w-2/3 rounded bg-[var(--color-surface-hover)]"></div>
					</div>
					<div class="flex gap-1.5">
						<div class="h-5 w-14 rounded bg-[var(--color-surface-hover)]"></div>
						<div class="h-5 w-10 rounded bg-[var(--color-surface-hover)]"></div>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Pagination -->
	<div class="mt-10">
		<Pagination currentPage={displayResults.page} totalPages={displayResults.nbPages} />
	</div>
</section>
