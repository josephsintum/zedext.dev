<script lang="ts">
	import { currentSearchParams, setSearchParams } from '$lib/search/client.svelte.js';
	import clsx from 'clsx';
	import { CATEGORIES } from '$lib/utils/constants.js';

	let { active = 'all' }: { active?: string } = $props();

	function selectCategory(slug: string) {
		const params = currentSearchParams();
		if (slug === 'all') params.delete('category');
		else params.set('category', slug);
		setSearchParams(params, { scroll: true });
	}
</script>

<div class="hide-scrollbar flex gap-1.5 overflow-x-auto">
	{#each CATEGORIES as cat}
		<button
			onclick={() => selectCategory(cat.slug)}
			class={clsx(
				'group relative shrink-0 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150',
				active === cat.slug
					? 'bg-[var(--color-text)] text-[var(--color-surface)] shadow-sm'
					: 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]'
			)}
		>
			{cat.label}
		</button>
	{/each}
</div>
