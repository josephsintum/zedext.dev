<script lang="ts">
	import { PALETTE_ROLES, type ThemeEntry } from '$lib/theme-picker.js';
	import { formatNumber } from '$lib/utils/format.js';

	let {
		entry,
		href,
		selected = false,
		circles = false,
		onselect,
		onintent
	}: {
		entry: ThemeEntry;
		href?: string;
		selected?: boolean;
		/** The theme picker draws the syntax colors as circles on the theme's background */
		circles?: boolean;
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
	<!-- Colors are validated hex values from the previews bundle -->
	{#if circles}
		<!-- Circles ringed in the background so they stay distinct where they overlap; they
		     spread apart on hover -->
		<span
			class="flex h-14 items-center px-3.5"
			aria-hidden="true"
			style:background-color={entry.palette.bg}
		>
			{#each PALETTE_ROLES as role (role)}
				<span
					class="size-6 rounded-full transition-[margin] duration-200 not-first:-ml-1 group-hover:not-first:ml-0.5 motion-reduce:transition-none"
					style:background-color={entry.palette[role]}
					style:box-shadow="0 0 0 2px {entry.palette.bg}"
				></span>
			{/each}
		</span>
	{:else}
		<span class="flex h-8" aria-hidden="true">
			<span class="flex-[2.2]" style:background-color={entry.palette.bg}></span>
			{#each PALETTE_ROLES as role (role)}
				<span class="flex-1" style:background-color={entry.palette[role]}></span>
			{/each}
		</span>
	{/if}
	<span class="block px-2.5 py-2">
		<span class="block truncate text-[13px] font-medium text-[var(--color-text)]">{entry.name}</span
		>
		<span class="block text-[12px] text-[var(--color-text-tertiary)] tabular-nums">
			{entry.variantCount > 1 ? `${entry.variantCount} variants · ` : ''}↓ {formatNumber(
				entry.downloads
			)}
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
