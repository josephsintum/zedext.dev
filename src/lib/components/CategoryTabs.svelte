<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import clsx from 'clsx';
	import { CATEGORIES } from '$lib/utils/constants.js';

	let { active = 'all' }: { active?: string } = $props();

	function selectCategory(slug: string) {
		const params = new URLSearchParams(page.url.searchParams);
		if (slug === 'all') params.delete('category');
		else params.set('category', slug);
		params.delete('page');
		goto(`?${params}`, { replaceState: true });
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
