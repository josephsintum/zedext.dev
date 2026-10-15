<script lang="ts">
	import { untrack } from 'svelte';
	import { afterNavigate, goto, preloadCode } from '$app/navigation';
	import { navigating, page } from '$app/state';
	import {
		carryQuery,
		currentSearchParams,
		dropCarriedQuery,
		loadIndex,
		setSearchParams,
		takeCarriedQuery
	} from '$lib/search/client.svelte.js';

	let {
		value = '',
		totalHits = 0,
		to,
		onSearch
	}: {
		value?: string;
		totalHits?: number;
		/** Search on another page: the first keystroke goes there and typing carries on */
		to?: string;
		onSearch?: (q: string) => void;
	} = $props();

	const placeholder = $derived(
		totalHits > 0 ? `Search ${totalHits.toLocaleString('en-US')} extensions…` : 'Search extensions…'
	);

	let input = $state(untrack(() => value));
	let focused = $state(false);
	let field: HTMLInputElement;

	/** Switching to the `to` page after the first keystroke */
	let leaving = $state(false);

	// The server is rendering results for a search or sort on this page (before the index
	// loads; after, results are instant). Show more navigations carry ?page= and aren't searches.
	const busy = $derived(
		to
			? leaving
			: navigating.to?.url.pathname === page.url.pathname &&
					!navigating.to.url.searchParams.has('page')
	);

	// "/" jumps to search from anywhere on the page, unless you're already typing somewhere
	function handleGlobalKeydown(e: KeyboardEvent) {
		if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
		const target = e.target as HTMLElement;
		if (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
			return;
		}
		e.preventDefault();
		field.focus();
	}
	let debounceTimer: ReturnType<typeof setTimeout>;

	// Follow outside URL changes (back button, links), but never overwrite what's being typed
	$effect(() => {
		const next = value;
		if (!untrack(() => focused)) input = next;
	});

	// A pending search must not fire after the page is gone
	$effect(() => () => clearTimeout(debounceTimer));

	// Arrived from another page's search box: keep what was typed, including keystrokes
	// made while this page loaded, and keep typing here. After the navigation, not on mount:
	// SvelteKit resets shallow state as its last step, which would undo the search
	afterNavigate(() => {
		if (to) return;
		const typed = takeCarriedQuery(page.url.pathname);
		if (typed === null) return;
		input = typed;
		field.focus();
		field.setSelectionRange(typed.length, typed.length);
		if (typed !== value) performSearch(typed, page.url.pathname);
	});

	function searchElsewhere(target: string) {
		if (!leaving && !input) return;
		carryQuery(target, input);
		if (leaving) return;
		leaving = true;
		// A cancelled or failed switch (another link clicked meanwhile) must not leave text
		// behind for a later visit
		goto(`${target}?q=${encodeURIComponent(input)}`)
			.then(() => page.url.pathname !== target && dropCarriedQuery(), dropCarriedQuery)
			.finally(() => (leaving = false));
	}

	function performSearch(q: string, path: string) {
		const params = currentSearchParams();
		if (q) params.set('q', q);
		else params.delete('q');
		setSearchParams(params, { path });
		onSearch?.(q);
	}

	function handleInput(e: Event) {
		input = (e.target as HTMLInputElement).value;
		if (to) return searchElsewhere(to);
		// Remember where the typing happened; the debounced search is dropped if we've left
		const path = page.url.pathname;
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => performSearch(input, path), 300);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			input = '';
			if (to) {
				if (leaving) carryQuery(to, '');
				return;
			}
			clearTimeout(debounceTimer);
			performSearch('', page.url.pathname);
		}
	}
</script>

<svelte:window onkeydown={handleGlobalKeydown} />

<div
	class="relative w-full transition-all duration-200 motion-reduce:transition-none"
	class:scale-[1.01]={focused}
>
	<div
		class="relative overflow-hidden rounded-xl border transition-all duration-200 motion-reduce:transition-none {focused
			? 'border-[var(--color-accent)] shadow-[var(--color-accent)]/10 shadow-lg'
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
			bind:this={field}
			type="search"
			aria-label="Search extensions"
			{placeholder}
			value={input}
			oninput={handleInput}
			onkeydown={handleKeydown}
			onfocus={() => {
				focused = true;
				// Start loading the search index as soon as someone looks like they'll search
				loadIndex();
				// Searches go to `to?q=…`, so only its code can be loaded ahead, not its data
				if (to) preloadCode(to).catch(() => {});
			}}
			onblur={() => (focused = false)}
			class="w-full bg-[var(--color-surface-raised)] py-3.5 pr-4 pl-12 font-sans text-[16px] text-[var(--color-text)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none sm:text-[15px]"
		/>
		<div class="absolute top-1/2 right-4 -translate-y-1/2">
			{#if busy}
				<span
					class="block h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-accent)] motion-reduce:animate-none"
					role="status"
					aria-label="Searching"
				></span>
			{:else if !focused}
				<kbd
					class="hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--color-text-tertiary)] sm:inline-block"
					>/</kbd
				>
			{/if}
		</div>
	</div>
</div>
