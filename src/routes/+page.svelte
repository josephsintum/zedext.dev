<script lang="ts">
	import ExtensionBrowser from '$lib/components/ExtensionBrowser.svelte';
	import ExtensionCard from '$lib/components/ExtensionCard.svelte';

	let { data } = $props();
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

<ExtensionBrowser initialResults={data.initialResults}>
	{#snippet intro()}
		<div class="mx-auto max-w-2xl text-center">
			<h1 class="text-4xl font-bold tracking-tight text-balance text-[var(--color-text)]">
				Extensions for <span class="font-mono text-[var(--color-accent)]">Zed</span>
			</h1>
			<p class="mt-3 text-[15px] leading-relaxed text-[var(--color-text-secondary)]">
				Browse the full Zed extension registry with rich detail pages, GitHub stats, and instant
				search.
			</p>
		</div>
	{/snippet}
	{#snippet discover()}
		{#if data.newThisWeek.length > 0}
			<section class="mx-auto max-w-6xl px-6 pt-8 pb-2" aria-labelledby="new-this-week">
				<h2
					id="new-this-week"
					class="mb-3 text-[13px] font-semibold tracking-wider text-[var(--color-text-secondary)] uppercase"
				>
					New this week
				</h2>
				<div class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
					{#each data.newThisWeek as hit (hit.id)}
						<ExtensionCard {hit} />
					{/each}
				</div>
			</section>
		{/if}
	{/snippet}
</ExtensionBrowser>
