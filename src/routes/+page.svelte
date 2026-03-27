<script lang="ts">
	import { page } from '$app/state';
	import { searchExtensions } from '$lib/search/algolia.js';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import CategoryTabs from '$lib/components/CategoryTabs.svelte';
	import SortSelect from '$lib/components/SortSelect.svelte';
	import ExtensionCard from '$lib/components/ExtensionCard.svelte';
	import { formatNumber } from '$lib/utils/format.js';
	import type { SearchResults, ExtensionHit } from '$lib/types.js';

	let { data } = $props();

	let query = $derived(page.url.searchParams.get('q') ?? '');
	let category = $derived(page.url.searchParams.get('category') ?? 'all');
	let sort = $derived(page.url.searchParams.get('sort') ?? 'downloads');

	let allHits: ExtensionHit[] = $state([]);
	let currentPage = $state(0);
	let totalHits = $state(0);
	let totalPages = $state(0);
	let facets: Record<string, Record<string, number>> = $state({});
	let loading = $state(false);
	let loadingMore = $state(false);
	let animateFrom = $state(0); // index from which new cards should animate

	// Track search params to detect changes and reset
	let lastSearchKey = $state('');

	$effect(() => {
		const searchKey = `${query}|${category}|${sort}`;

		if (searchKey !== lastSearchKey) {
			// Search params changed — reset to page 0
			lastSearchKey = searchKey;
			currentPage = 0;
			animateFrom = 0;
			loading = true;

			searchExtensions(query, { category, sort, page: 0 }).then((r) => {
				allHits = r.hits;
				totalHits = r.nbHits;
				totalPages = r.nbPages;
				facets = r.facets;
				loading = false;
			});
		}
	});

	function loadMore() {
		if (loadingMore || currentPage + 1 >= totalPages) return;

		const nextPage = currentPage + 1;
		loadingMore = true;
		animateFrom = allHits.length;

		searchExtensions(query, { category, sort, page: nextPage }).then((r) => {
			allHits = [...allHits, ...r.hits];
			currentPage = nextPage;
			facets = r.facets;
			loadingMore = false;
		});
	}

	const hasMore = $derived(currentPage + 1 < totalPages);
	const remaining = $derived(totalHits - allHits.length);

	// Use SSR data as initial state
	const displayHits = $derived(allHits.length > 0 ? allHits : data.initialResults.hits);
	const displayFacets = $derived(
		Object.keys(facets).length > 0 ? facets : (data.initialResults.facets ?? {})
	);
	const displayTotalHits = $derived(totalHits || data.initialResults.nbHits);
</script>

<svelte:head>
	<title>ZedExt — Discover Zed Extensions</title>
	<meta
		name="description"
		content="The best way to discover, search, and explore extensions for the Zed editor. Rich detail pages with README, GitHub stats, and version history."
	/>
</svelte:head>

<!-- Hero with dot grid background -->
<section class="dot-grid border-b border-[var(--color-border)]">
	<div class="mx-auto max-w-7xl px-6 pt-16 pb-10">
		<div class="mx-auto max-w-2xl text-center">
			<h1 class="text-4xl font-bold tracking-tight text-[var(--color-text)]">
				Extensions for <span class="font-mono text-[var(--color-accent)]">Zed</span>
			</h1>
			<p class="mt-3 text-[15px] leading-relaxed text-[var(--color-text-secondary)]">
				Browse the full Zed extension registry with rich detail pages, GitHub stats, and instant
				search.
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
		<CategoryTabs active={category} facets={displayFacets?.provides ?? {}} />
		<div class="flex items-center gap-3">
			{#if displayTotalHits > 0}
				<span class="text-[13px] text-[var(--color-text-tertiary)] tabular-nums">
					{formatNumber(displayTotalHits)} results
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
		{#each displayHits as hit, i (hit.objectID)}
			<div
				class="min-w-0 {i >= animateFrom ? 'animate-fade-up' : ''}"
				style={i >= animateFrom ? `animation-delay: ${(i - animateFrom) * 15}ms` : ''}
			>
				<ExtensionCard {hit} />
			</div>
		{/each}
	</div>

	<!-- Empty state -->
	{#if displayHits.length === 0 && !loading}
		<div class="flex flex-col items-center py-24">
			<div
				class="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-surface-hover)]"
			>
				<svg
					class="h-8 w-8 text-[var(--color-text-tertiary)]"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
					stroke-width="1.5"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
					/>
				</svg>
			</div>
			<p class="mt-4 text-[15px] font-medium text-[var(--color-text-secondary)]">
				No extensions found
			</p>
			{#if query}
				<p class="mt-1.5 text-[13px] text-[var(--color-text-tertiary)]">
					No results for "<span class="font-mono">{query}</span>". Try a different search term.
				</p>
			{/if}
		</div>
	{/if}

	<!-- Loading shimmer (initial load only) -->
	{#if loading && displayHits.length === 0}
		<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{#each Array(12) as _, i}
				<div
					class="animate-pulse rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4"
					style="animation-delay: {i * 30}ms"
				>
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

	<!-- Load More -->
	{#if hasMore && displayHits.length > 0}
		<div class="mt-10 flex justify-center">
			<button
				onclick={loadMore}
				disabled={loadingMore}
				class="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-6 py-2.5 text-[14px] font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-border-hover)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] disabled:pointer-events-none disabled:opacity-50"
			>
				{#if loadingMore}
					<svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
						<circle
							cx="12"
							cy="12"
							r="10"
							stroke="currentColor"
							stroke-width="2"
							class="opacity-25"
						/>
						<path
							fill="currentColor"
							class="opacity-75"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
						/>
					</svg>
					Loading...
				{:else}
					Load More
					{#if remaining > 0}
						<span class="text-[var(--color-text-tertiary)]">({formatNumber(remaining)} more)</span>
					{/if}
				{/if}
			</button>
		</div>
	{/if}
</section>
