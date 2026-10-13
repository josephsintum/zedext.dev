<script lang="ts">
	import clsx from 'clsx';
	import { CATEGORIES } from '$lib/utils/constants.js';
	import { categoryHref } from '$lib/categories.js';
	import { currentSearchParams } from '$lib/search/client.svelte.js';

	let { active = 'all' }: { active?: string } = $props();

	// Switching category keeps the current search and sort
	const keep = $derived.by(() => {
		const params = currentSearchParams();
		const kept = new URLSearchParams();
		for (const key of ['q', 'sort']) {
			const value = params.get(key);
			if (value) kept.set(key, value);
		}
		const search = kept.toString();
		return search ? `?${search}` : '';
	});
</script>

<div class="hide-scrollbar flex gap-1.5 overflow-x-auto">
	{#each CATEGORIES as cat (cat.slug)}
		<a
			href={categoryHref(cat.provides ?? 'all') + keep}
			aria-current={active === cat.slug ? 'page' : undefined}
			class={clsx(
				'group relative shrink-0 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150',
				active === cat.slug
					? 'bg-[var(--color-text)] text-[var(--color-surface)] shadow-sm'
					: 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]'
			)}
		>
			{cat.label}
		</a>
	{/each}
</div>
