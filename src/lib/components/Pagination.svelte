<script lang="ts">
	import { goto } from '$app/navigation';
	import { page as pageStore } from '$app/state';
	import { cn } from '$lib/utils.js';

	let { currentPage = 0, totalPages = 0 }: { currentPage?: number; totalPages?: number } = $props();

	function goToPage(p: number) {
		const params = new URLSearchParams(pageStore.url.searchParams);
		if (p === 0) params.delete('page');
		else params.set('page', String(p + 1));
		goto(`?${params}`, { replaceState: true });
	}

	const pages = $derived(() => {
		const items: (number | '...')[] = [];
		const total = totalPages;
		const current = currentPage;

		if (total <= 7) {
			for (let i = 0; i < total; i++) items.push(i);
		} else {
			items.push(0);
			if (current > 2) items.push('...');
			for (let i = Math.max(1, current - 1); i <= Math.min(total - 2, current + 1); i++) {
				items.push(i);
			}
			if (current < total - 3) items.push('...');
			items.push(total - 1);
		}
		return items;
	});
</script>

{#if totalPages > 1}
	<nav class="flex items-center justify-center gap-0.5">
		<button
			onclick={() => goToPage(currentPage - 1)}
			disabled={currentPage === 0}
			class="mr-2 rounded-lg px-3 py-2 text-[13px] font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-hover)] disabled:pointer-events-none disabled:opacity-30"
		>
			<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
				<path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
			</svg>
		</button>

		{#each pages() as p}
			{#if p === '...'}
				<span class="px-1 text-[13px] text-[var(--color-text-tertiary)]">...</span>
			{:else}
				<button
					onclick={() => goToPage(p)}
					class={cn(
						'h-8 w-8 rounded-lg text-[13px] font-medium tabular-nums transition-colors',
						p === currentPage
							? 'bg-[var(--color-text)] text-white'
							: 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'
					)}
				>
					{p + 1}
				</button>
			{/if}
		{/each}

		<button
			onclick={() => goToPage(currentPage + 1)}
			disabled={currentPage >= totalPages - 1}
			class="ml-2 rounded-lg px-3 py-2 text-[13px] font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-hover)] disabled:pointer-events-none disabled:opacity-30"
		>
			<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
				<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
			</svg>
		</button>
	</nav>
{/if}
