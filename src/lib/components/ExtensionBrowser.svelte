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
	import ProvideTag from '$lib/components/ProvideTag.svelte';
	import { formatNumber, timeAgo } from '$lib/utils/format.js';
	import { getViewMode, setViewMode } from '$lib/stores/viewMode.svelte.js';
	import { parseRepoUrl } from '$lib/utils/parse-repo-url.js';
	import {
		filterProvides,
		getHoverBorder,
		provideLabel,
		provideDotColor
	} from '$lib/utils/extension-ui.js';
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
<section class="border-border border-b">
	<div class="mx-auto max-w-6xl px-6 pt-14 pb-8">
		{@render intro()}
		<div class="mx-auto mt-6 max-w-2xl">
			<SearchBar value={query} totalHits={displayTotalHits} />
		</div>
	</div>
</section>

<!-- Sticky filter bar -->
<div class="border-border bg-surface-raised sticky top-14 z-40 border-b backdrop-blur-md">
	<div class="mx-auto max-w-6xl px-6 pt-4 pb-3">
		<div class="flex items-center justify-between gap-4">
			<CategoryTabs active={category} />
			<div class="flex shrink-0 items-center gap-3">
				{#if displayTotalHits > 0}
					<span class="text-text-tertiary text-[12px] tabular-nums">
						{formatNumber(displayTotalHits)}
					</span>
				{/if}
			</div>
		</div>
	</div>
</div>

<!-- Sort bar + view toggle -->
<div class="mx-auto max-w-6xl px-6">
	<div class="text-text-tertiary flex items-center justify-between py-3 text-[12px]">
		<span
			>sort:
			{#each sortOptions as sf, i}<button
					onclick={() => selectSort(sf.value)}
					aria-pressed={sort === sf.value}
					class="hit-y px-1.5 transition-colors {sort === sf.value
						? 'text-accent font-bold'
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
				class="border-border bg-surface-raised hover:border-text-tertiary mb-2 flex items-center justify-between rounded-lg border border-dashed px-5 py-3.5 transition-colors"
			>
				<div class="flex items-center gap-3">
					<span class="text-text text-[13px] font-medium">{feature.name}</span>
					<span class="text-text-tertiary text-[13px]">{feature.message}</span>
				</div>
				<span class="text-text-tertiary shrink-0 text-[12px]">View docs ↗</span>
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
				{@const provides = filterProvides(hit.provides)}
				{@const owner = parseRepoUrl(hit.repository ?? '')?.owner}
				<div
					class="group border-border bg-surface-raised flex flex-col rounded-lg border p-4 transition-colors duration-150 {getHoverBorder(
						hit
					)}"
				>
					<a href="/extensions/{hit.id}" class="block rounded-sm outline-offset-4">
						<!-- Name + downloads -->
						<div class="mb-1.5 flex items-start justify-between gap-2">
							<h3
								class="text-accent group-hover:text-accent-hover min-w-0 truncate font-mono text-[14px] font-semibold"
							>
								{hit.name}
							</h3>
							<span
								class="text-text-tertiary flex shrink-0 items-center gap-1 text-[12px] tabular-nums"
							>
								<svg
									class="h-3.5 w-3.5"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
									stroke-width="1.5"
									aria-hidden="true"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
									/>
								</svg>
								{formatNumber(hit.download_count)}
							</span>
						</div>

						<!-- Description -->
						{#if hit.description}
							<p class="text-text-secondary mb-3 line-clamp-2 text-[13px] leading-relaxed">
								{hit.description}
							</p>
						{:else}
							<div class="mb-3"></div>
						{/if}

						<!-- Provide tags -->
						{#if provides.length > 0}
							<div class="mb-3 flex flex-wrap gap-1">
								{#each provides.slice(0, 2) as provide}
									<ProvideTag {provide} />
								{/each}
							</div>
						{/if}
					</a>

					<!-- Footer: stars + author -->
					<div
						class="border-border text-text-tertiary mt-auto flex items-center gap-3 border-t pt-3 text-[12px]"
					>
						{#if hit.github_stars > 0}
							<span class="flex items-center gap-1 tabular-nums">
								<svg
									class="h-3.5 w-3.5"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
									stroke-width="1.5"
									aria-hidden="true"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
									/>
								</svg>
								{formatNumber(hit.github_stars)}
							</span>
						{/if}
						{#if owner}
							<a
								href="/authors/{owner}"
								class="hover:text-accent -my-3.5 ml-auto truncate py-3.5 text-[11px] transition-colors"
							>
								{hit.authors[0] ?? 'Unknown'}
							</a>
						{:else}
							<span class="ml-auto truncate text-[11px]">
								{hit.authors[0] ?? 'Unknown'}
							</span>
						{/if}
					</div>
				</div>
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
				class="border-border text-text-tertiary hidden border-b py-2 text-[11px] font-medium sm:grid sm:grid-cols-[1fr_5rem_4.5rem_4.5rem_6rem] sm:items-center sm:gap-4"
			>
				<button
					onclick={() => selectSort('name')}
					class="text-left tracking-wider uppercase transition-colors {sort === 'name'
						? 'text-accent font-bold'
						: 'hover:text-text-secondary'}"
				>
					Name
				</button>
				<span class="text-left">Type</span>
				<button
					onclick={() => selectSort('downloads')}
					class="text-left tracking-wider uppercase transition-colors {sort === 'downloads'
						? 'text-accent font-bold'
						: 'hover:text-text-secondary'}"
				>
					Downloads
				</button>
				<button
					onclick={() => selectSort('stars')}
					class="text-left tracking-wider uppercase transition-colors {sort === 'stars'
						? 'text-accent font-bold'
						: 'hover:text-text-secondary'}"
				>
					Stars
				</button>
				<button
					onclick={() => selectSort('updated')}
					class="text-left tracking-wider uppercase transition-colors {sort === 'updated'
						? 'text-accent font-bold'
						: 'hover:text-text-secondary'}"
				>
					Published
				</button>
			</div>

			{#each displayHits as hit (hit.id)}
				{@const provides = filterProvides(hit.provides)}
				<!-- Desktop: grid row -->
				<a
					href="/extensions/{hit.id}"
					class="border-border/50 hover:bg-surface-hover hidden border-b py-2.5 text-[13px] transition-colors sm:grid sm:grid-cols-[1fr_5rem_4.5rem_4.5rem_6rem] sm:items-center sm:gap-4"
				>
					<span class="min-w-0 truncate">
						<span class="text-text font-mono font-semibold">{hit.name}</span>
						{#if hit.description}
							<span class="text-text-tertiary ml-2">{hit.description}</span>
						{/if}
					</span>

					<span class="text-text-tertiary flex items-center gap-1.5 text-[12px]">
						{#if provides.length > 0}
							<span
								class="inline-block h-2.5 w-2.5 rounded-full {provideDotColor[provides[0]] ??
									'bg-zinc-400'}"
							></span>
							{provideLabel[provides[0]] ?? provides[0]}
						{/if}
					</span>

					<span class="text-text-tertiary flex items-center gap-1 text-[12px] tabular-nums">
						<svg
							class="h-3.5 w-3.5"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							stroke-width="1.5"
							aria-hidden="true"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
							/>
						</svg>
						{formatNumber(hit.download_count)}
					</span>

					<span class="text-text-tertiary flex items-center gap-1 text-[12px] tabular-nums">
						{#if hit.github_stars > 0}
							<svg
								class="h-3.5 w-3.5"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								stroke-width="1.5"
								aria-hidden="true"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
								/>
							</svg>
							{formatNumber(hit.github_stars)}
						{:else}
							—
						{/if}
					</span>

					<span class="text-text-tertiary text-[12px]">
						{timeAgo(hit.published_at)}
					</span>
				</a>

				<!-- Mobile: simple row -->
				<a
					href="/extensions/{hit.id}"
					class="border-border/50 hover:bg-surface-hover flex items-center justify-between gap-4 border-b py-2.5 text-[13px] transition-colors sm:hidden"
				>
					<span class="text-text min-w-0 truncate font-mono font-semibold">{hit.name}</span>
					<span class="text-text-tertiary shrink-0 text-[11px] tabular-nums"
						>{formatNumber(hit.download_count)}</span
					>
				</a>
			{/each}
		</div>
	{/if}

	<!-- Empty state -->
	{#if displayHits.length === 0 && !loading}
		<div class="flex flex-col items-center gap-3 py-20 text-center">
			<p class="text-text-secondary text-[14px]">
				{query ? `No extensions match “${query}”.` : 'No extensions found.'}
			</p>
			{#if query}
				<button
					type="button"
					onclick={clearSearch}
					class="border-border text-text hover:bg-surface-hover min-h-11 rounded-md border px-4 text-[13px] font-medium"
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
						class="border-border bg-surface-raised rounded-md border p-3 motion-safe:animate-pulse"
						style="animation-delay: {i * 25}ms"
					>
						<div class="bg-surface-hover mb-1.5 h-3.5 w-20 rounded"></div>
						<div class="bg-surface-hover h-3 w-full rounded"></div>
					</div>
				{/each}
			</div>
		{:else}
			<div class="space-y-0">
				{#each Array(12) as _, i}
					<div
						class="border-border/50 flex items-center gap-4 border-b py-2.5 motion-safe:animate-pulse"
						style="animation-delay: {i * 25}ms"
					>
						<div class="bg-surface-hover h-3.5 w-24 rounded"></div>
						<div class="bg-surface-hover h-3.5 flex-1 rounded"></div>
						<div class="bg-surface-hover h-3.5 w-12 rounded"></div>
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
				class="border-border rounded-md border px-5 py-2 text-[13px] font-medium opacity-70 transition-opacity hover:opacity-100 disabled:pointer-events-none disabled:opacity-30"
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
