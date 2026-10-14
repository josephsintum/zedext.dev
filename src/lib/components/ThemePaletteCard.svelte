<script lang="ts">
	import type { ThemeEntry } from '$lib/theme-picker.js';
	import { formatNumber } from '$lib/utils/format.js';

	let {
		entry,
		href,
		selected = false,
		onselect
	}: { entry: ThemeEntry; href?: string; selected?: boolean; onselect?: () => void } = $props();

	// Background first and widest, then the syntax colors people notice most
	const ROLES = ['keyword', 'function', 'string', 'type', 'number', 'comment'] as const;
	const classes = $derived(
		`block w-full overflow-hidden rounded-lg border bg-[var(--color-surface-raised)] text-left transition-colors ${
			selected
				? 'border-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/30'
				: 'border-[var(--color-border)] hover:border-[var(--color-border-hover)]'
		}`
	);
</script>

{#snippet body()}
	<!-- Colors are validated hex values from the previews bundle -->
	<span class="flex h-8" aria-hidden="true">
		<span class="flex-[2.2]" style:background-color={entry.palette.bg}></span>
		{#each ROLES as role (role)}
			<span class="flex-1" style:background-color={entry.palette[role]}></span>
		{/each}
	</span>
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
	<button type="button" class={classes} aria-pressed={selected} onclick={onselect}
		>{@render body()}</button
	>
{/if}
