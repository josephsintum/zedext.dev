<script lang="ts">
	import type { ExtensionCardData } from '$lib/types.js';
	import { formatNumber } from '$lib/utils/format.js';
	import { primaryKind, shownProvides } from '$lib/kinds.js';
	import ProvideTag from './ProvideTag.svelte';
	import StatIcon from './StatIcon.svelte';

	// The homepage rows show downloads where other pages show the version
	let { hit, badge = 'version' }: { hit: ExtensionCardData; badge?: 'version' | 'downloads' } =
		$props();

	const provides = $derived(shownProvides(hit.provides));
	const accentBorder = $derived(
		primaryKind(hit.provides)?.hoverBorderLeft ?? 'hover:border-l-zinc-400'
	);
</script>

{#snippet downloads()}
	<span class="flex items-center gap-1 tabular-nums">
		<StatIcon name="downloads" />
		{formatNumber(hit.download_count)}<span class="sr-only"> downloads</span>
	</span>
{/snippet}

<a
	href="/extensions/{hit.id}"
	class="card-hover group relative flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-surface-raised p-4 {accentBorder}"
>
	<div class="mb-1.5 flex items-start justify-between gap-2">
		<h3 class="min-w-0 truncate text-14 font-semibold text-text group-hover:text-accent-hover">
			{hit.name}
		</h3>
		<span
			class="shrink-0 rounded-md bg-surface px-1.5 py-0.5 text-11 text-text-tertiary {badge ===
			'version'
				? 'font-mono'
				: ''}"
		>
			{#if badge === 'version'}
				v{hit.version}
			{:else}
				{@render downloads()}
			{/if}
		</span>
	</div>

	{#if hit.description}
		<p class="mb-3 line-clamp-2 min-w-0 text-13 leading-relaxed text-text-secondary">
			{hit.description}
		</p>
	{:else}
		<div class="mb-3"></div>
	{/if}

	<div class="mt-auto flex flex-wrap gap-1">
		{#each provides.slice(0, 2) as provide}
			<ProvideTag {provide} />
		{/each}
	</div>

	<div class="mt-3 flex items-center gap-3 border-t border-border pt-3 text-12 text-text-tertiary">
		{#if badge === 'version'}
			{@render downloads()}
		{/if}

		<!-- Stars -->
		{#if hit.github_stars > 0}
			<span class="flex items-center gap-1 tabular-nums">
				<StatIcon name="stars" />
				{formatNumber(hit.github_stars)}
			</span>
		{/if}

		<span class="ml-auto truncate text-11">
			{hit.authors[0] ?? 'Unknown'}
		</span>
	</div>
</a>
