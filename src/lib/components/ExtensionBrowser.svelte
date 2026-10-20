<script lang="ts">
	import { goto } from '$app/navigation';
	import { navigating, page } from '$app/state';
	import type { Snippet } from 'svelte';
	import type { SearchResults } from '$lib/types.js';
	import {
		currentSearchParams,
		getIndex,
		loadIndex,
		setPageParam,
		setSearchParams
	} from '$lib/search/client.svelte.js';
	import { clampPage, PER_PAGE } from '$lib/search/paging.js';
	import { searchIndex } from '$lib/search/engine.js';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import CategoryTabs from '$lib/components/CategoryTabs.svelte';
	import ExtensionGridCard from '$lib/components/ExtensionGridCard.svelte';
	import StatIcon from '$lib/components/StatIcon.svelte';
	import { formatNumber, timeAgo } from '$lib/utils/format.js';
	import { getViewMode, setViewMode } from '$lib/stores/viewMode.svelte.js';
	import { primaryKind } from '$lib/kinds.js';
	import { getMatchingBuiltinFeatures } from '$lib/utils/constants.js';
	import { categoryForPath } from '$lib/categories.js';

	let {
		initialResults,
		category = 'all',
		intro
	}: {
		initialResults: SearchResults;
		category?: string;
		intro: Snippet;
	} = $props();

	const params = $derived(currentSearchParams());
	let query = $derived(params.get('q') ?? '');
	let sort = $derived(params.get('sort') ?? 'downloads');
	const builtinMatches = $derived(getMatchingBuiltinFeatures(query));

	// Pages shown live in the URL (?page=), so Back from an extension returns to the same spot.
	// Any search change drops the param, which resets to one page.
	const pages = $derived(clampPage(params.get('page')));

	const index = $derived(getIndex());
	const results = $derived(
		index
			? searchIndex(index, query, { category, sort, hitsPerPage: PER_PAGE * pages })
			: initialResults
	);

	const displayHits = $derived(results.hits);
	const displayTotalHits = $derived(results.nbHits);
	const hasMore = $derived(displayHits.length < displayTotalHits);
	const remaining = $derived(displayTotalHits - displayHits.length);
	// The server is rendering more pages of this same list (Show more without the index)
	const loadingMore = $derived(
		navigating.to?.url.pathname === page.url.pathname && navigating.to.url.searchParams.has('page')
	);
	// A search on this page or a switch to another category dims the list, not leaving it
	const loading = $derived(
		!!navigating.to &&
			!loadingMore &&
			(navigating.to.url.pathname === page.url.pathname ||
				categoryForPath(navigating.to.url.pathname) !== undefined)
	);

	function loadMore() {
		const next = currentSearchParams();
		next.set('page', String(pages + 1));
		if (index) {
			setPageParam(next);
		} else {
			// The server renders the longer list; meanwhile the index loads for the next click
			goto(`?${next}`, { replaceState: true, noScroll: true, keepFocus: true });
			loadIndex();
		}
	}

	let viewMode = $derived(getViewMode());

	const sortOptions = [
		{ value: 'downloads', label: 'popular' },
		{ value: 'updated', label: 'recent' },
		{ value: 'stars', label: 'stars' },
		{ value: 'name', label: 'a-z' }
	];

	function clearSearch() {
		const next = currentSearchParams();
		next.delete('q');
		setSearchParams(next, { scroll: true });
		// The button disappears with the empty state; keep keyboard focus somewhere useful
		document.querySelector<HTMLInputElement>('main input[type="search"]')?.focus();
	}

	function selectSort(value: string) {
		const next = currentSearchParams();
		if (value === 'downloads') next.delete('sort');
		else next.set('sort', value);
		setSearchParams(next, { scroll: true });
	}
</script>

<!-- Hero -->
<section class="border-b border-border">
	<div class="mx-auto max-w-6xl px-6 pt-14 pb-8">
		{@render intro()}
		<div class="mx-auto mt-6 max-w-2xl">
			<SearchBar value={query} totalHits={displayTotalHits} />
		</div>
	</div>
</section>

<!-- Sticky filter bar -->
<div class="sticky top-14 z-40 border-b border-border bg-surface-raised backdrop-blur-md">
	<div class="mx-auto max-w-6xl px-6 pt-4 pb-3">
		<div class="flex items-center justify-between gap-4">
			<CategoryTabs active={category} />
			<div class="flex shrink-0 items-center gap-3">
				{#if displayTotalHits > 0}
					<span class="text-12 text-text-tertiary tabular-nums">
						{formatNumber(displayTotalHits)}
					</span>
				{/if}
			</div>
		</div>
	</div>
</div>

<!-- Sort bar + view toggle -->
<div class="mx-auto max-w-6xl px-6">
	<div class="flex items-center justify-between py-3 text-12 text-text-tertiary">
		<span
			>sort:
			{#each sortOptions as sf, i}<button
					onclick={() => selectSort(sf.value)}
					aria-pressed={sort === sf.value}
					class="hit-y px-1.5 transition-colors {sort === sf.value
						? 'font-bold text-accent'
						: 'hover:text-text-secondary'}">{sf.label}</button
				>{#if i < sortOptions.length - 1}<span>/</span>{/if}{/each}
		</span>
		<div class="flex items-center gap-1">
			<button
				onclick={() => setViewMode('grid')}
				class="flex h-11 w-11 items-center justify-center rounded-md transition-colors sm:h-7 sm:w-7 {viewMode ===
				'grid'
					? 'bg-surface-hover text-text'
					: 'hover:text-text-secondary'}"
				aria-label="Grid view"
				aria-pressed={viewMode === 'grid'}
			>
				<svg
					class="h-4 w-4"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
					stroke-width="1.5"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
					/>
				</svg>
			</button>
			<button
				onclick={() => setViewMode('list')}
				class="flex h-11 w-11 items-center justify-center rounded-md transition-colors sm:h-7 sm:w-7 {viewMode ===
				'list'
					? 'bg-surface-hover text-text'
					: 'hover:text-text-secondary'}"
				aria-label="List view"
				aria-pressed={viewMode === 'list'}
			>
				<svg
					class="h-4 w-4"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
					stroke-width="1.5"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z"
					/>
				</svg>
			</button>
		</div>
	</div>
</div>

<!-- Built-in feature banners -->
{#if builtinMatches.length > 0}
	<div class="mx-auto max-w-6xl px-6">
		{#each builtinMatches as feature}
			<a
				href="https://zed.dev{feature.docsUrl}"
				target="_blank"
				rel="noopener noreferrer"
				class="mb-2 flex items-center justify-between rounded-lg border border-dashed border-border bg-surface-raised px-5 py-3.5 transition-colors hover:border-text-tertiary"
			>
				<div class="flex items-center gap-3">
					<span class="text-13 font-medium text-text">{feature.name}</span>
					<span class="text-13 text-text-tertiary">{feature.message}</span>
				</div>
				<span class="shrink-0 text-12 text-text-tertiary">View docs ↗</span>
			</a>
		{/each}
	</div>
{/if}

<!-- Content -->
<div class="mx-auto max-w-6xl px-6 pb-5">
	<!-- Cards are h3s; screen readers need a level above them -->
	<h2 class="sr-only">Extensions</h2>
	{#if viewMode === 'grid'}
		<!-- Grid view -->
		<div
			class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
			class:opacity-40={loading}
			class:pointer-events-none={loading}
			style="transition: opacity 0.15s ease"
		>
			{#each displayHits as hit (hit.id)}
				<ExtensionGridCard {hit} />
			{/each}
		</div>
	{:else}
		<!-- List view -->
		<div
			class:opacity-40={loading}
			class:pointer-events-none={loading}
			style="transition: opacity 0.15s ease"
		>
			<!-- Column headers -->
			<div
				class="hidden border-b border-border py-2 text-11 font-medium text-text-tertiary sm:grid sm:grid-cols-[1fr_5rem_4.5rem_4.5rem_6rem] sm:items-center sm:gap-4"
			>
				<button
					onclick={() => selectSort('name')}
					class="text-left tracking-wider uppercase transition-colors {sort === 'name'
						? 'font-bold text-accent'
						: 'hover:text-text-secondary'}"
				>
					Name
				</button>
				<span class="text-left">Type</span>
				<button
					onclick={() => selectSort('downloads')}
					class="text-left tracking-wider uppercase transition-colors {sort === 'downloads'
						? 'font-bold text-accent'
						: 'hover:text-text-secondary'}"
				>
					Downloads
				</button>
				<button
					onclick={() => selectSort('stars')}
					class="text-left tracking-wider uppercase transition-colors {sort === 'stars'
						? 'font-bold text-accent'
						: 'hover:text-text-secondary'}"
				>
					Stars
				</button>
				<button
					onclick={() => selectSort('updated')}
					class="text-left tracking-wider uppercase transition-colors {sort === 'updated'
						? 'font-bold text-accent'
						: 'hover:text-text-secondary'}"
				>
					Updated
				</button>
			</div>

			{#each displayHits as hit (hit.id)}
				{@const kind = primaryKind(hit.provides)}
				<!-- Desktop: grid row -->
				<a
					href="/extensions/{hit.id}"
					class="hidden border-b border-border/50 py-2.5 text-13 transition-colors hover:bg-surface-hover sm:grid sm:grid-cols-[1fr_5rem_4.5rem_4.5rem_6rem] sm:items-center sm:gap-4"
				>
					<span class="min-w-0 truncate">
						<span class="font-mono font-semibold text-text">{hit.name}</span>
						{#if hit.description}
							<span class="ml-2 text-text-tertiary">{hit.description}</span>
						{/if}
					</span>

					<span class="flex items-center gap-1.5 text-12 text-text-tertiary">
						{#if kind}
							<span class="inline-block h-2.5 w-2.5 rounded-full {kind.dot}"></span>
							{kind.tag}
						{/if}
					</span>

					<span class="flex items-center gap-1 text-12 text-text-tertiary tabular-nums">
						<StatIcon name="downloads" />
						{formatNumber(hit.download_count)}
					</span>

					<span class="flex items-center gap-1 text-12 text-text-tertiary tabular-nums">
						{#if hit.github_stars > 0}
							<StatIcon name="stars" />
							{formatNumber(hit.github_stars)}
						{:else}
							—
						{/if}
					</span>

					<span class="text-12 text-text-tertiary">
						{timeAgo(hit.published_at)}
					</span>
				</a>

				<!-- Mobile: simple row -->
				<a
					href="/extensions/{hit.id}"
					class="flex items-center justify-between gap-4 border-b border-border/50 py-2.5 text-13 transition-colors hover:bg-surface-hover sm:hidden"
				>
					<span class="min-w-0 truncate font-mono font-semibold text-text">{hit.name}</span>
					<span class="shrink-0 text-11 text-text-tertiary tabular-nums"
						>{formatNumber(hit.download_count)}</span
					>
				</a>
			{/each}
		</div>
	{/if}

	<!-- Empty state -->
	{#if displayHits.length === 0 && !loading}
		<div class="flex flex-col items-center gap-3 py-20 text-center">
			<p class="text-14 text-text-secondary">
				{query ? `No extensions match “${query}”.` : 'No extensions found.'}
			</p>
			{#if query}
				<button
					type="button"
					onclick={clearSearch}
					class="min-h-11 rounded-md border border-border px-4 text-13 font-medium text-text hover:bg-surface-hover"
				>
					Clear Search
				</button>
			{/if}
		</div>
	{/if}

	<!-- Loading shimmer -->
	{#if loading && displayHits.length === 0}
		{#if viewMode === 'grid'}
			<div class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				{#each Array(16) as _, i}
					<div
						class="rounded-md border border-border bg-surface-raised p-3 motion-safe:animate-pulse"
						style="animation-delay: {i * 25}ms"
					>
						<div class="mb-1.5 h-3.5 w-20 rounded bg-surface-hover"></div>
						<div class="h-3 w-full rounded bg-surface-hover"></div>
					</div>
				{/each}
			</div>
		{:else}
			<div class="space-y-0">
				{#each Array(12) as _, i}
					<div
						class="flex items-center gap-4 border-b border-border/50 py-2.5 motion-safe:animate-pulse"
						style="animation-delay: {i * 25}ms"
					>
						<div class="h-3.5 w-24 rounded bg-surface-hover"></div>
						<div class="h-3.5 flex-1 rounded bg-surface-hover"></div>
						<div class="h-3.5 w-12 rounded bg-surface-hover"></div>
					</div>
				{/each}
			</div>
		{/if}
	{/if}

	<!-- Load More -->
	{#if hasMore && displayHits.length > 0}
		<div class="mt-6 flex justify-center">
			<button
				onclick={loadMore}
				disabled={loadingMore}
				class="rounded-md border border-border px-5 py-2 text-13 font-medium opacity-70 transition-opacity hover:opacity-100 disabled:pointer-events-none disabled:opacity-30"
			>
				{#if loadingMore}
					Loading…
				{:else}
					Show more ({formatNumber(remaining)})
				{/if}
			</button>
		</div>
	{/if}
</div>
