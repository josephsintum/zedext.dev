<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { searchExtensions } from '$lib/search/algolia.js';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import CategoryTabs from '$lib/components/CategoryTabs.svelte';
	import ProvideTag from '$lib/components/ProvideTag.svelte';
	import { formatNumber, timeAgo } from '$lib/utils/format.js';
	import { getViewMode, setViewMode } from '$lib/stores/viewMode.svelte.js';
	import type { ExtensionHit } from '$lib/types.js';
	import { parseRepoUrl } from '$lib/utils/parse-repo-url.js';
	import {
		filterProvides,
		getHoverBorder,
		provideLabel,
		provideDotColor
	} from '$lib/utils/extension-ui.js';
	import { getMatchingBuiltinFeatures } from '$lib/utils/constants.js';

	let { data } = $props();

	let query = $derived(page.url.searchParams.get('q') ?? '');
	let category = $derived(page.url.searchParams.get('category') ?? 'all');
	let sort = $derived(page.url.searchParams.get('sort') ?? 'downloads');
	const builtinMatches = $derived(getMatchingBuiltinFeatures(query));

	// Client-side search state — only used after user interaction
	let clientHits: ExtensionHit[] = $state([]);
	let clientPage = $state(0);
	let clientTotalHits = $state(0);
	let clientTotalPages = $state(0);
	let clientFacets: Record<string, Record<string, number>> = $state({});
	let loading = $state(false);
	let loadingMore = $state(false);
	let hasClientResults = $state(false);

	// Track the SSR search key to avoid redundant client fetch
	let ssrSearchKey = $derived(`${data.ssrQuery}|${data.ssrCategory}|${data.ssrSort}`);
	let lastSearchKey = $state('');

	$effect(() => {
		const searchKey = `${query}|${category}|${sort}`;
		// Skip if this matches what SSR already returned
		if (searchKey === ssrSearchKey && !hasClientResults) {
			lastSearchKey = searchKey;
			return;
		}
		if (searchKey !== lastSearchKey) {
			lastSearchKey = searchKey;
			clientPage = 0;
			loading = true;

			searchExtensions(query, { category, sort, page: 0 })
				.then((r) => {
					clientHits = r.hits;
					clientTotalHits = r.nbHits;
					clientTotalPages = r.nbPages;
					clientFacets = r.facets;
					hasClientResults = true;
				})
				.catch(() => {})
				.finally(() => {
					loading = false;
				});
		}
	});

	function loadMore() {
		if (loadingMore || clientPage + 1 >= displayTotalPages) return;
		const nextPage = clientPage + 1;
		loadingMore = true;

		searchExtensions(query, { category, sort, page: nextPage })
			.then((r) => {
				clientHits = [...displayHits, ...r.hits];
				clientPage = nextPage;
				clientFacets = r.facets;
				hasClientResults = true;
			})
			.catch(() => {})
			.finally(() => {
				loadingMore = false;
			});
	}

	// Use client results if available, otherwise SSR data
	const displayHits = $derived(hasClientResults ? clientHits : data.initialResults.hits);
	const displayFacets = $derived(
		hasClientResults ? clientFacets : (data.initialResults.facets ?? {})
	);
	const displayTotalHits = $derived(
		hasClientResults ? clientTotalHits : data.initialResults.nbHits
	);
	const displayTotalPages = $derived(
		hasClientResults ? clientTotalPages : data.initialResults.nbPages
	);

	const hasMore = $derived(
		hasClientResults
			? clientPage + 1 < clientTotalPages
			: data.initialResults.page + 1 < data.initialResults.nbPages
	);
	const remaining = $derived(displayTotalHits - displayHits.length);

	let viewMode = $derived(getViewMode());

	const sortOptions = [
		{ value: 'downloads', label: 'popular' },
		{ value: 'updated', label: 'recent' },
		{ value: 'stars', label: 'stars' },
		{ value: 'name', label: 'a-z' }
	];

	function selectSort(value: string) {
		const params = new URLSearchParams(page.url.searchParams);
		if (value === 'downloads') params.delete('sort');
		else params.set('sort', value);
		params.delete('page');
		goto(`?${params}`, { replaceState: true });
	}
</script>

<svelte:head>
	<title>ZedExt — Discover Zed Extensions</title>
	<meta
		name="description"
		content="The best way to discover, search, and explore extensions for the Zed editor. Rich detail pages with README, GitHub stats, and version history."
	/>
	<link rel="canonical" href="https://zedext.dev" />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="ZedExt" />
	<meta property="og:url" content="https://zedext.dev" />
	<meta property="og:title" content="ZedExt — Discover Zed Extensions" />
	<meta
		property="og:description"
		content="The best way to discover, search, and explore extensions for the Zed editor."
	/>
	<meta
		property="og:image"
		content="https://zedext.dev/og?title=ZedExt&description=Discover%2C+search%2C+and+explore+extensions+for+the+Zed+editor"
	/>
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<!-- Hero -->
<section class="border-b border-[var(--color-border)]">
	<div class="mx-auto max-w-6xl px-6 pt-14 pb-8">
		<div class="mx-auto max-w-2xl text-center">
			<h1 class="text-4xl font-bold tracking-tight text-balance text-[var(--color-text)]">
				Extensions for <span class="font-mono text-[var(--color-accent)]">Zed</span>
			</h1>
			<p class="mt-3 text-[15px] leading-relaxed text-[var(--color-text-secondary)]">
				Browse the full Zed extension registry with rich detail pages, GitHub stats, and instant
				search.
			</p>
		</div>
		<div class="mx-auto mt-6 max-w-2xl">
			<SearchBar value={query} totalHits={displayTotalHits} />
		</div>
	</div>
</section>

<!-- Sticky filter bar -->
<div
	class="sticky top-14 z-40 border-b border-[var(--color-border)] bg-[var(--color-surface-raised)] backdrop-blur-md"
>
	<div class="mx-auto max-w-6xl px-6 pt-4 pb-3">
		<div class="flex items-center justify-between gap-4">
			<CategoryTabs active={category} />
			<div class="flex shrink-0 items-center gap-3">
				{#if displayTotalHits > 0}
					<span class="text-[12px] tabular-nums opacity-50">
						{formatNumber(displayTotalHits)}
					</span>
				{/if}
			</div>
		</div>
	</div>
</div>

<!-- Sort bar + view toggle -->
<div class="mx-auto max-w-6xl px-6">
	<div class="flex items-center justify-between py-3 text-[12px] text-[var(--color-text-tertiary)]">
		<span
			>sort:
			{#each sortOptions as sf, i}<button
					onclick={() => selectSort(sf.value)}
					class="transition-colors {sort === sf.value
						? 'font-bold text-[var(--color-accent)]'
						: 'hover:text-[var(--color-text-secondary)]'}">{sf.label}</button
				>{#if i < sortOptions.length - 1}<span>/</span>{/if}{/each}
		</span>
		<div class="flex items-center gap-1">
			<button
				onclick={() => setViewMode('grid')}
				class="flex h-7 w-7 items-center justify-center rounded-md transition-colors {viewMode ===
				'grid'
					? 'bg-[var(--color-surface-hover)] text-[var(--color-text)]'
					: 'hover:text-[var(--color-text-secondary)]'}"
				aria-label="Grid view"
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
				class="flex h-7 w-7 items-center justify-center rounded-md transition-colors {viewMode ===
				'list'
					? 'bg-[var(--color-surface-hover)] text-[var(--color-text)]'
					: 'hover:text-[var(--color-text-secondary)]'}"
				aria-label="List view"
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
				class="mb-2 flex items-center justify-between rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface-raised)] px-5 py-3.5 transition-colors hover:border-[var(--color-text-tertiary)]"
			>
				<div class="flex items-center gap-3">
					<span class="text-[13px] font-medium text-[var(--color-text)]">{feature.name}</span>
					<span class="text-[13px] text-[var(--color-text-tertiary)]">{feature.message}</span>
				</div>
				<span class="shrink-0 text-[12px] text-[var(--color-text-tertiary)]">View docs ↗</span>
			</a>
		{/each}
	</div>
{/if}

<!-- Content -->
<div class="mx-auto max-w-6xl px-6 pb-5">
	{#if viewMode === 'grid'}
		<!-- Grid view -->
		<div
			class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
			class:opacity-40={loading}
			class:pointer-events-none={loading}
			style="transition: opacity 0.15s ease"
		>
			{#each displayHits as hit (hit.objectID)}
				{@const provides = filterProvides(hit.provides)}
				{@const owner = parseRepoUrl(hit.repository ?? '')?.owner}
				<div
					class="group flex flex-col rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4 transition-colors duration-150 {getHoverBorder(
						hit
					)}"
				>
					<a href="/extensions/{hit.objectID}" class="contents">
						<!-- Name + downloads -->
						<div class="mb-1.5 flex items-start justify-between gap-2">
							<h3
								class="min-w-0 truncate font-mono text-[14px] font-semibold text-[var(--color-accent)] group-hover:text-[var(--color-accent-hover)]"
							>
								{hit.name}
							</h3>
							<span
								class="flex shrink-0 items-center gap-1 text-[12px] text-[var(--color-text-tertiary)] tabular-nums"
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
							<p
								class="mb-3 line-clamp-2 text-[13px] leading-relaxed text-[var(--color-text-secondary)]"
							>
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
						class="mt-auto flex items-center gap-3 border-t border-[var(--color-border)] pt-3 text-[12px] text-[var(--color-text-tertiary)]"
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
								class="ml-auto truncate text-[11px] transition-colors hover:text-[var(--color-accent)]"
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
				class="hidden border-b border-[var(--color-border)] py-2 text-[11px] font-medium text-[var(--color-text-tertiary)] sm:grid sm:grid-cols-[1fr_5rem_4.5rem_4.5rem_6rem] sm:items-center sm:gap-4"
			>
				<button
					onclick={() => selectSort('name')}
					class="text-left tracking-wider uppercase transition-colors {sort === 'name'
						? 'font-bold text-[var(--color-accent)]'
						: 'hover:text-[var(--color-text-secondary)]'}"
				>
					Name
				</button>
				<span class="text-left">Type</span>
				<button
					onclick={() => selectSort('downloads')}
					class="text-left tracking-wider uppercase transition-colors {sort === 'downloads'
						? 'font-bold text-[var(--color-accent)]'
						: 'hover:text-[var(--color-text-secondary)]'}"
				>
					Downloads
				</button>
				<button
					onclick={() => selectSort('stars')}
					class="text-left tracking-wider uppercase transition-colors {sort === 'stars'
						? 'font-bold text-[var(--color-accent)]'
						: 'hover:text-[var(--color-text-secondary)]'}"
				>
					Stars
				</button>
				<button
					onclick={() => selectSort('updated')}
					class="text-left tracking-wider uppercase transition-colors {sort === 'updated'
						? 'font-bold text-[var(--color-accent)]'
						: 'hover:text-[var(--color-text-secondary)]'}"
				>
					Published
				</button>
			</div>

			{#each displayHits as hit (hit.objectID)}
				{@const provides = filterProvides(hit.provides)}
				<!-- Desktop: grid row -->
				<a
					href="/extensions/{hit.objectID}"
					class="hidden border-b border-[var(--color-border)]/50 py-2.5 text-[13px] transition-colors hover:bg-[var(--color-surface-hover)] sm:grid sm:grid-cols-[1fr_5rem_4.5rem_4.5rem_6rem] sm:items-center sm:gap-4"
				>
					<span class="min-w-0 truncate">
						<span class="font-mono font-semibold text-[var(--color-text)]">{hit.name}</span>
						{#if hit.description}
							<span class="ml-2 text-[var(--color-text-tertiary)]">{hit.description}</span>
						{/if}
					</span>

					<span class="flex items-center gap-1.5 text-[12px] text-[var(--color-text-tertiary)]">
						{#if provides.length > 0}
							<span
								class="inline-block h-2.5 w-2.5 rounded-full {provideDotColor[provides[0]] ??
									'bg-zinc-400'}"
							></span>
							{provideLabel[provides[0]] ?? provides[0]}
						{/if}
					</span>

					<span
						class="flex items-center gap-1 text-[12px] text-[var(--color-text-tertiary)] tabular-nums"
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

					<span
						class="flex items-center gap-1 text-[12px] text-[var(--color-text-tertiary)] tabular-nums"
					>
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

					<span class="text-[12px] text-[var(--color-text-tertiary)]">
						{timeAgo(hit.published_at)}
					</span>
				</a>

				<!-- Mobile: simple row -->
				<a
					href="/extensions/{hit.objectID}"
					class="flex items-center justify-between gap-4 border-b border-[var(--color-border)]/50 py-2.5 text-[13px] transition-colors hover:bg-[var(--color-surface-hover)] sm:hidden"
				>
					<span class="min-w-0 truncate font-mono font-semibold text-[var(--color-text)]"
						>{hit.name}</span
					>
					<span class="shrink-0 text-[11px] text-[var(--color-text-tertiary)] tabular-nums"
						>{formatNumber(hit.download_count)}</span
					>
				</a>
			{/each}
		</div>
	{/if}

	<!-- Empty state -->
	{#if displayHits.length === 0 && !loading}
		<div class="flex flex-col items-center py-20">
			<p class="text-[14px] opacity-50">No extensions found</p>
		</div>
	{/if}

	<!-- Loading shimmer -->
	{#if loading && displayHits.length === 0}
		{#if viewMode === 'grid'}
			<div class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				{#each Array(16) as _, i}
					<div
						class="animate-pulse rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3"
						style="animation-delay: {i * 25}ms"
					>
						<div class="mb-1.5 h-3.5 w-20 rounded bg-[var(--color-surface-hover)]"></div>
						<div class="h-3 w-full rounded bg-[var(--color-surface-hover)]"></div>
					</div>
				{/each}
			</div>
		{:else}
			<div class="space-y-0">
				{#each Array(12) as _, i}
					<div
						class="flex animate-pulse items-center gap-4 border-b border-[var(--color-border)]/50 py-2.5"
						style="animation-delay: {i * 25}ms"
					>
						<div class="h-3.5 w-24 rounded bg-[var(--color-surface-hover)]"></div>
						<div class="h-3.5 flex-1 rounded bg-[var(--color-surface-hover)]"></div>
						<div class="h-3.5 w-12 rounded bg-[var(--color-surface-hover)]"></div>
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
				class="rounded-md border border-[var(--color-border)] px-5 py-2 text-[13px] font-medium opacity-70 transition-opacity hover:opacity-100 disabled:pointer-events-none disabled:opacity-30"
			>
				{#if loadingMore}
					Loading...
				{:else}
					Show more ({formatNumber(remaining)})
				{/if}
			</button>
		</div>
	{/if}
</div>
