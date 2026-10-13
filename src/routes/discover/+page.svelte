<script lang="ts">
	import ExtensionCard from '$lib/components/ExtensionCard.svelte';
	import ThemeTile from '$lib/components/ThemeTile.svelte';
	import Seo from '$lib/components/Seo.svelte';
	import { timeAgo } from '$lib/utils/format.js';

	let { data } = $props();

	const jumps = $derived([
		...(data.newest.length > 0 ? [{ id: 'new', label: 'New' }] : []),
		...(data.updated.length > 0 ? [{ id: 'updated', label: 'Updated' }] : []),
		...data.sections.map((s) => ({ id: s.key, label: s.title })),
		{ id: 'languages', label: 'Languages' }
	]);
</script>

<Seo
	title="Discover Zed extensions — ZedExt"
	description="New and recently updated Zed extensions, the best extensions for each language, web development, everyday file types, dark and light themes, and MCP servers."
	path="/discover"
	ogTitle="Discover Zed extensions"
/>

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

{#snippet group(section: (typeof data.sections)[number])}
	<h2
		id={section.key}
		class="mt-14 scroll-mt-20 border-t border-[var(--color-border)] pt-5 text-[12px] font-semibold tracking-wider text-[var(--color-text-tertiary)] uppercase"
	>
		{section.title}
	</h2>
	{#each section.rows as row (row.list.slug)}
		<section class="mt-6">
			{@render heading(
				`c-${row.list.slug}`,
				`${row.list.emoji} ${row.list.title}`,
				row.list.description,
				`/discover/${row.list.slug}`,
				`See all ${row.total}`
			)}
			{#if row.tiles}
				<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
					{#each row.tiles as tile (tile.record.id)}
						<ThemeTile {tile} />
					{/each}
				</div>
			{:else}
				<div class="grid auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
					{#each row.items as hit (hit.id)}
						<ExtensionCard {hit} />
					{/each}
				</div>
			{/if}
		</section>
	{/each}
{/snippet}

<div class="mx-auto max-w-6xl px-6 pt-12 pb-20">
	<div class="text-center">
		<h1 class="text-4xl font-bold tracking-tight text-[var(--color-text)]">Discover</h1>
		<p class="mt-3 text-[15px] text-[var(--color-text-secondary)]">
			What's new, and the best extensions by language, stack and theme.
		</p>
		<nav class="mt-5 flex flex-wrap justify-center gap-1.5" aria-label="Sections">
			{#each jumps as j (j.id)}
				<a
					href="#{j.id}"
					class="rounded-full border border-[var(--color-border)] px-2.5 py-1 text-[12px] text-[var(--color-text-secondary)] hover:border-[var(--color-border-hover)]"
					>{j.label}</a
				>
			{/each}
		</nav>
	</div>

	{#if data.newest.length > 0}
		<section class="mt-10">
			{@render heading(
				'new',
				'New',
				'Just added to the registry · themes have their own section below'
			)}
			<div class="grid auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
				{#each data.newest as hit (hit.id)}
					<ExtensionCard {hit} note="Added {timeAgo(hit.first_published_at!)}" />
				{/each}
			</div>
		</section>
	{/if}

	{#if data.updated.length > 0}
		<section class="mt-10">
			{@render heading('updated', 'Recently updated', 'Fresh releases of popular extensions')}
			<div class="grid auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
				{#each data.updated as hit (hit.id)}
					<ExtensionCard {hit} note="Updated {timeAgo(hit.published_at)}" />
				{/each}
			</div>
		</section>
	{/if}

	{#each data.sections as section (section.key)}
		{@render group(section)}
	{/each}

	<section class="mt-14 border-t border-[var(--color-border)] pt-8">
		{@render heading(
			'languages',
			'Languages',
			"What's built in, and the extensions that add more",
			'/languages',
			'All languages'
		)}
		<div class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
			{#each data.hubs as hub (hub.slug)}
				<a
					href="/languages/{hub.slug}"
					class="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 py-2.5 hover:border-[var(--color-border-hover)]"
				>
					<span class="block text-[14px] font-medium text-[var(--color-text)]"
						>{hub.emoji} {hub.name}</span
					>
					<span class="text-[12px] text-[var(--color-text-tertiary)]">
						{hub.builtIn ? 'Built in · ' : ''}{hub.count} extensions
					</span>
				</a>
			{/each}
		</div>
	</section>
</div>
