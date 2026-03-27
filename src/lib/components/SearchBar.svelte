<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	let { value = '', onSearch }: { value?: string; onSearch?: (q: string) => void } = $props();

	let input = $state(value);
	let focused = $state(false);
	let debounceTimer: ReturnType<typeof setTimeout>;

	function handleInput(e: Event) {
		const q = (e.target as HTMLInputElement).value;
		input = q;
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			const params = new URLSearchParams(page.url.searchParams);
			if (q) params.set('q', q);
			else params.delete('q');
			params.delete('page');
			goto(`?${params}`, { replaceState: true, keepFocus: true });
			onSearch?.(q);
		}, 300);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			input = '';
			handleInput({ target: { value: '' } } as unknown as Event);
		}
	}
</script>

<div class="relative w-full transition-all duration-200" class:scale-[1.01]={focused}>
	<div
		class="relative overflow-hidden rounded-xl border transition-all duration-200 {focused
			? 'border-[var(--color-accent)] shadow-lg shadow-amber-500/10'
			: 'border-[var(--color-border)] shadow-sm'}"
	>
		<svg
			class="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 transition-colors duration-200"
			class:text-[var(--color-accent)]={focused}
			class:text-[var(--color-text-tertiary)]={!focused}
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
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
			placeholder="Search 1,600+ extensions..."
			{value}
			oninput={handleInput}
			onkeydown={handleKeydown}
			onfocus={() => (focused = true)}
			onblur={() => (focused = false)}
			class="w-full bg-[var(--color-surface-raised)] py-3.5 pl-12 pr-4 font-sans text-[15px] text-[var(--color-text)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none"
		/>
		<div class="absolute right-4 top-1/2 -translate-y-1/2">
			<kbd
				class="hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--color-text-tertiary)] sm:inline-block"
				>/</kbd
			>
		</div>
	</div>
</div>
