<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	import { formatNumber } from '$lib/utils/format.js';

	let {
		value = '',
		totalHits = 0,
		onSearch
	}: { value?: string; totalHits?: number; onSearch?: (q: string) => void } = $props();

	const placeholder = $derived(
		totalHits > 0 ? `Search ${formatNumber(totalHits)}+ extensions…` : 'Search extensions…'
	);

	let input = $state(value);
	let focused = $state(false);
	let debounceTimer: ReturnType<typeof setTimeout>;

	function performSearch(q: string) {
		const params = new URLSearchParams(page.url.searchParams);
		if (q) params.set('q', q);
		else params.delete('q');
		params.delete('page');
		goto(`?${params}`, { replaceState: true, keepFocus: true });
		onSearch?.(q);
	}

	function handleInput(e: Event) {
		input = (e.target as HTMLInputElement).value;
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => performSearch(input), 300);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			input = '';
			clearTimeout(debounceTimer);
			performSearch('');
		}
	}
</script>

<div
	class="relative w-full transition-all duration-200 motion-reduce:transition-none"
	class:scale-[1.01]={focused}
>
	<div
		class="relative overflow-hidden rounded-xl border transition-all duration-200 motion-reduce:transition-none {focused
			? 'border-[var(--color-accent)] shadow-lg shadow-[var(--color-accent)]/10'
			: 'border-[var(--color-border)] shadow-sm'}"
	>
		<svg
			class="absolute top-1/2 left-4 h-[18px] w-[18px] -translate-y-1/2 transition-colors duration-200"
			class:text-[var(--color-accent)]={focused}
			class:text-[var(--color-text-tertiary)]={!focused}
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
			aria-hidden="true"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
			/>
		</svg>
		<input
			type="search"
			aria-label="Search extensions"
			{placeholder}
			{value}
			oninput={handleInput}
			onkeydown={handleKeydown}
			onfocus={() => (focused = true)}
			onblur={() => (focused = false)}
			class="w-full bg-[var(--color-surface-raised)] py-3.5 pr-4 pl-12 font-sans text-[15px] text-[var(--color-text)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none"
		/>
		<div class="absolute top-1/2 right-4 -translate-y-1/2">
			<kbd
				class="hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--color-text-tertiary)] sm:inline-block"
				>/</kbd
			>
		</div>
	</div>
</div>
