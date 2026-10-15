<script lang="ts">
	import { cardColors, type ThemeEntry } from '$lib/theme-picker.js';
	import { formatNumber } from '$lib/utils/format.js';

	let {
		entry,
		href,
		selected = false,
		onselect,
		onintent
	}: {
		entry: ThemeEntry;
		href?: string;
		selected?: boolean;
		onselect?: () => void;
		/** Hover or keyboard focus: a hint to start loading this theme */
		onintent?: () => void;
	} = $props();

	// A pointer sweeping across the grid isn't interest; resting on a card for a moment is
	const HOVER_DELAY_MS = 120;
	let hoverTimer: ReturnType<typeof setTimeout> | undefined;
	function hoverStart() {
		clearTimeout(hoverTimer);
		hoverTimer = setTimeout(() => onintent?.(), HOVER_DELAY_MS);
	}
	function hoverEnd() {
		clearTimeout(hoverTimer);
	}

	const classes = $derived(
		`group block w-full overflow-hidden rounded-lg border bg-[var(--color-surface-raised)] text-left transition-colors ${
			selected
				? 'border-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/30'
				: 'border-[var(--color-border)] hover:border-[var(--color-border-hover)]'
		}`
	);
</script>

{#snippet body()}
	<!-- The syntax colors as circles on the theme's background, ringed in it so they stay
	     distinct where they overlap. The circles size to the card (a container query): smaller
	     and still on narrow cards, so six always fit without squashing; full size and spreading
	     apart on hover once there's room. Colors are validated hex values from the previews
	     bundle -->
	<span
		class="@container flex h-14 items-center px-3"
		aria-hidden="true"
		style:background-color={entry.palette.bg}
	>
		{#each cardColors(entry.palette) as color (color)}
			<span
				class="size-5 shrink-0 rounded-full transition-[margin] duration-200 not-first:-ml-1.5 motion-reduce:transition-none @min-[160px]:size-6 @min-[160px]:not-first:-ml-1 @min-[160px]:group-hover:not-first:ml-0.5"
				style:background-color={color}
				style:box-shadow="0 0 0 2px {entry.palette.bg}"
			></span>
		{/each}
	</span>
	<span class="block px-2.5 py-2">
		<span class="block truncate text-[13px] font-medium text-[var(--color-text)]">{entry.name}</span
		>
		<!-- Downloads on the right, so they line up down the grid -->
		<span
			class="flex justify-between gap-2 text-[12px] text-[var(--color-text-tertiary)] tabular-nums"
		>
			<span>{entry.variantCount > 1 ? `${entry.variantCount} variants` : ''}</span>
			<span>↓ {formatNumber(entry.downloads)}</span>
		</span>
	</span>
{/snippet}

{#if href}
	<a {href} class={classes}>{@render body()}</a>
{:else}
	<button
		type="button"
		class={classes}
		aria-pressed={selected}
		onclick={onselect}
		onpointerenter={hoverStart}
		onpointerleave={hoverEnd}
		onfocus={onintent}>{@render body()}</button
	>
{/if}
