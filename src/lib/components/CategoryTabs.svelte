<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { cn } from '$lib/utils.js';
	import { CATEGORIES } from '$lib/utils/constants.js';
	import { formatNumber } from '$lib/utils/format.js';

	let { active = 'all', facets = {} }: { active?: string; facets?: Record<string, number> } =
		$props();

	function selectCategory(slug: string) {
		const params = new URLSearchParams(page.url.searchParams);
		if (slug === 'all') params.delete('category');
		else params.set('category', slug);
		params.delete('page');
		goto(`?${params}`, { replaceState: true });
	}

	const totalCount = $derived(Object.values(facets).reduce((a, b) => a + b, 0));
</script>

<div class="hide-scrollbar flex gap-1.5 overflow-x-auto">
	{#each CATEGORIES as cat}
		{@const count = cat.provides ? facets[cat.provides] : totalCount || undefined}
		<button
			onclick={() => selectCategory(cat.slug)}
			class={cn(
				'group relative shrink-0 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150',
				active === cat.slug
					? 'bg-[var(--color-text)] text-white shadow-sm'
					: 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]'
			)}
		>
			<span>{cat.label}</span>
			{#if count !== undefined}
				<span
					class={cn(
						'ml-1.5 tabular-nums',
						active === cat.slug ? 'text-white/60' : 'text-[var(--color-text-tertiary)]'
					)}
				>
					{formatNumber(count)}
				</span>
			{/if}
		</button>
	{/each}
</div>
