<script lang="ts">
	import type { ExtensionHit } from '$lib/types.js';
	import { primaryKind, shownProvides } from '$lib/kinds.js';
	import { formatNumber } from '$lib/utils/format.js';
	import { parseRepoUrl } from '$lib/utils/parse-repo-url.js';
	import ProvideTag from './ProvideTag.svelte';
	import StatIcon from './StatIcon.svelte';

	// The card in /extensions and category grids. Author pages leave out the footer (stars and
	// author), so the whole card can be one link
	let { hit, footer = true }: { hit: ExtensionHit; footer?: boolean } = $props();

	const provides = $derived(shownProvides(hit.provides));
	const owner = $derived(parseRepoUrl(hit.repository ?? '')?.owner);
	const card = $derived(
		`group flex flex-col rounded-lg border border-border bg-surface-raised p-4 transition-colors duration-150 ${primaryKind(hit.provides)?.hoverBorder ?? ''}`
	);
</script>

{#snippet body(tags: string)}
	<!-- Name + downloads -->
	<div class="mb-1.5 flex items-start justify-between gap-2">
		<h3
			class="min-w-0 truncate font-mono text-14 font-semibold text-accent group-hover:text-accent-hover"
		>
			{hit.name}
		</h3>
		<span class="flex shrink-0 items-center gap-1 text-12 text-text-tertiary tabular-nums">
			<StatIcon name="downloads" />
			{formatNumber(hit.download_count)}
		</span>
	</div>

	{#if hit.description}
		<p class="mb-3 line-clamp-2 text-13 leading-relaxed text-text-secondary">
			{hit.description}
		</p>
	{:else}
		<div class="mb-3"></div>
	{/if}

	{#if provides.length > 0}
		<div class="{tags} flex flex-wrap gap-1">
			{#each provides.slice(0, 2) as provide}
				<ProvideTag {provide} />
			{/each}
		</div>
	{/if}
{/snippet}

{#if footer}
	<div class={card}>
		<a href="/extensions/{hit.id}" class="block rounded-sm outline-offset-4">
			{@render body('mb-3')}
		</a>

		<!-- Footer: stars + author -->
		<div
			class="mt-auto flex items-center gap-3 border-t border-border pt-3 text-12 text-text-tertiary"
		>
			{#if hit.github_stars > 0}
				<span class="flex items-center gap-1 tabular-nums">
					<StatIcon name="stars" />
					{formatNumber(hit.github_stars)}
				</span>
			{/if}
			{#if owner}
				<a
					href="/authors/{owner.toLowerCase()}"
					class="-my-3.5 ml-auto truncate py-3.5 text-11 transition-colors hover:text-accent"
				>
					{hit.authors[0] ?? 'Unknown'}
				</a>
			{:else}
				<span class="ml-auto truncate text-11">
					{hit.authors[0] ?? 'Unknown'}
				</span>
			{/if}
		</div>
	</div>
{:else}
	<a href="/extensions/{hit.id}" class={card}>
		{@render body('mt-auto')}
	</a>
{/if}
