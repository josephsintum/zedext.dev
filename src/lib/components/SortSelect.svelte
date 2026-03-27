<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { SORT_OPTIONS } from '$lib/utils/constants.js';

	let { value = 'downloads' }: { value?: string } = $props();

	function handleChange(e: Event) {
		const sort = (e.target as HTMLSelectElement).value;
		const params = new URLSearchParams(page.url.searchParams);
		if (sort === 'downloads') params.delete('sort');
		else params.set('sort', sort);
		params.delete('page');
		goto(`?${params}`, { replaceState: true });
	}
</script>

<div class="relative">
	<select
		{value}
		onchange={handleChange}
		class="appearance-none rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] py-2 pl-3 pr-8 text-[13px] font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-border-hover)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/10"
	>
		{#each SORT_OPTIONS as opt}
			<option value={opt.value}>{opt.label}</option>
		{/each}
	</select>
	<svg
		class="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-text-tertiary)]"
		fill="none"
		stroke="currentColor"
		viewBox="0 0 24 24"
		stroke-width="2"
	>
		<path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
	</svg>
</div>
