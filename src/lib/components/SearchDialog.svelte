<script lang="ts">
	import { tick } from 'svelte';
	import { beforeNavigate, goto } from '$app/navigation';
	import { getIndex, getIndexStatus, loadIndex } from '$lib/search/client.svelte.js';
	import { searchIndex } from '$lib/search/engine.js';
	import { highlight, QUICK_LIMIT, searchHref } from '$lib/search/palette.js';
	import { primaryKind } from '$lib/kinds.js';
	import { readRecent } from '$lib/search/recent.js';
	import { countOf, formatNumber } from '$lib/utils/format.js';
	import type { ExtensionRecord } from '$lib/types.js';

	/**
	 * The search window (⌘K, "/", or the header's search button) on pages without their own
	 * search box. Empty, it lists recently viewed extensions; typing shows the top matches, and
	 * the last row hands off to the full results page.
	 */

	let dialog: HTMLDialogElement;
	let field: HTMLInputElement;
	let q = $state('');
	/** The highlighted row, which Enter opens: the first one whenever the list changes */
	let active = $state(0);
	let recentIds = $state<string[]>([]);
	/** For screen readers: the result count (or why there's none), once typing pauses */
	let announcement = $state('');
	/** Backdrop clicks close only if they also started there, not when a text selection ends there */
	let downOnBackdrop = false;

	const index = $derived(getIndex());
	const query = $derived(q.trim());
	const results = $derived(
		index && query ? searchIndex(index, query, { hitsPerPage: QUICK_LIMIT }) : null
	);
	const rows = $derived<ExtensionRecord[]>(
		query ? (results?.hits ?? []) : index ? recentIds.flatMap((id) => index.byId.get(id) ?? []) : []
	);
	/** The last row, "See all N results", whenever a search has matches */
	const seeAll = $derived(!!results && results.nbHits > 0);
	const count = $derived(rows.length + (seeAll ? 1 : 0));

	const optionId = (i: number) => `search-option-${i}`;

	export function open(): void {
		if (dialog.open) return;
		active = 0;
		recentIds = readRecent();
		loadIndex();
		dialog.showModal();
		// Keep the scrollbar's space, if the page has one, so the page doesn't shift sideways
		const html = document.documentElement;
		if (innerWidth > html.clientWidth) html.style.scrollbarGutter = 'stable';
		html.style.overflow = 'hidden';
		field.focus();
	}

	export function close(): void {
		dialog.close();
	}

	export function isOpen(): boolean {
		return dialog.open;
	}

	// Every way of closing ends here: Esc, the buttons, the backdrop, ⌘K, opening a result.
	// The browser has already put focus back where it was before the window opened
	function handleClose() {
		document.documentElement.style.overflow = '';
		document.documentElement.style.scrollbarGutter = '';
		q = '';
	}

	// Opening a result (the rows are plain links, so ⌘-click opens a tab), back, forward or any
	// other navigation closes the window, right away rather than once the next page has loaded.
	// Opening the extension you're on just closes it: a reload would jump to the top
	beforeNavigate((navigation) => {
		if (!dialog.open) return;
		close();
		if (navigation.to?.url.href === location.href) navigation.cancel();
	});

	function move(step: 1 | -1) {
		if (count === 0) return;
		active = (active + step + count) % count;
		tick().then(() =>
			document.getElementById(optionId(active))?.scrollIntoView({ block: 'nearest' })
		);
	}

	function handleKeydown(e: KeyboardEvent) {
		// Keys that finish an IME composition (Japanese, Chinese, Korean) belong to the composition
		if (e.isComposing || e.keyCode === 229) return;
		if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
			e.preventDefault();
			move(e.key === 'ArrowDown' ? 1 : -1);
		} else if (e.key === 'Enter') {
			e.preventDefault();
			// Until the index loads (or if it can't), the full results page searches on the server
			if (query && !index) return goto(searchHref(query));
			if (active < rows.length) goto(`/extensions/${rows[active].id}`);
			else if (seeAll) goto(searchHref(query));
		}
	}

	$effect(() => {
		const text = !query
			? ''
			: !results
				? getIndexStatus() === 'failed'
					? 'Search couldn’t load'
					: 'Searching…'
				: results.nbHits === 0
					? `No extensions match ${query}`
					: countOf(results.nbHits, 'result');
		const timer = setTimeout(() => (announcement = text), 300);
		return () => clearTimeout(timer);
	});
</script>

<!-- A click on the backdrop lands on the dialog itself (its content fills it); Esc is native -->
<dialog
	bind:this={dialog}
	aria-label="Search extensions"
	onclose={handleClose}
	onpointerdown={(e) => (downOnBackdrop = e.target === dialog)}
	onclick={(e) => downOnBackdrop && e.target === dialog && close()}
	class="m-0 mx-auto mt-[72px] w-[min(620px,calc(100%-32px))] max-w-none overflow-hidden rounded-[14px] border border-border bg-surface-raised p-0 text-text shadow-2xl backdrop:bg-black/30 backdrop:backdrop-blur-[2px] max-sm:mt-0 max-sm:h-dvh max-sm:max-h-none max-sm:w-full max-sm:rounded-none max-sm:border-0 dark:backdrop:bg-black/50"
>
	<div class="flex max-h-[min(500px,calc(100dvh-100px))] flex-col max-sm:h-full max-sm:max-h-none">
		<div class="flex h-13 shrink-0 items-center gap-2.5 border-b border-border px-3.5 max-sm:h-14">
			<svg
				aria-hidden="true"
				class="h-[18px] w-[18px] shrink-0 text-accent"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
				stroke-width="2"
				stroke-linecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg
			>
			<input
				bind:this={field}
				bind:value={q}
				oninput={() => (active = 0)}
				onkeydown={handleKeydown}
				type="text"
				role="combobox"
				aria-label="Search extensions"
				aria-expanded={count > 0}
				aria-controls="search-options"
				aria-autocomplete="list"
				aria-activedescendant={count > 0 ? optionId(active) : undefined}
				placeholder="Search extensions…"
				autocomplete="off"
				spellcheck="false"
				enterkeyhint="go"
				class="min-w-0 flex-1 bg-transparent font-sans text-[16px] text-text placeholder:text-text-tertiary focus:outline-none"
			/>
			<button
				type="button"
				onclick={close}
				aria-label="Close (esc)"
				class="rounded border border-border px-1.5 font-mono text-11 text-text-tertiary hover:text-text-secondary max-sm:hidden"
			>
				esc
			</button>
			<button type="button" onclick={close} class="min-h-11 px-1 text-15 text-accent sm:hidden">
				Cancel
			</button>
		</div>

		<div class="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5">
			{#if !query && rows.length > 0}
				<p
					class="px-2.5 pt-2.5 pb-1 text-11 font-semibold tracking-wide text-text-tertiary uppercase"
				>
					Recently viewed
				</p>
			{/if}
			<!-- "See all" sits below the scrolling rows so it's always in view; aria-owns keeps it in the list -->
			<div
				id="search-options"
				role="listbox"
				aria-label={query ? 'Results' : 'Recently viewed'}
				aria-owns={seeAll ? optionId(rows.length) : undefined}
			>
				{#each rows as record, i (record.id)}
					{@const kind = primaryKind(record.provides)?.name}
					{@const parts = highlight(record.name, query)}
					<a
						id={optionId(i)}
						href="/extensions/{record.id}"
						role="option"
						aria-selected={i === active}
						tabindex="-1"
						onmousemove={() => (active = i)}
						class="flex min-h-12 items-center gap-3 rounded-lg px-2.5 py-2 max-sm:min-h-14 {i ===
						active
							? 'bg-surface-hover ring-1 ring-border ring-inset'
							: ''}"
					>
						<span class="min-w-0 flex-1">
							<span class="flex min-w-0 items-center gap-2">
								<span class="truncate text-14 font-medium text-text">
									{#if parts}{parts[0]}<mark class="bg-transparent font-semibold text-accent"
											>{parts[1]}</mark
										>{parts[2]}{:else}{record.name}{/if}
								</span>
								{#if kind}
									<span
										class="shrink-0 rounded-full border border-border px-1.5 text-11 leading-[18px] font-medium text-text-secondary"
										>{kind}</span
									>
								{/if}
							</span>
							{#if record.description}
								<span class="block truncate text-13 text-text-secondary">{record.description}</span>
							{/if}
						</span>
						<span class="shrink-0 text-12 text-text-tertiary tabular-nums"
							>{formatNumber(record.download_count)}<span class="sr-only"> downloads</span></span
						>
						<span
							aria-hidden="true"
							class="shrink-0 text-13 text-text-tertiary {i === active ? '' : 'invisible'}">↵</span
						>
					</a>
				{/each}
			</div>

			{#if !results?.nbHits}
				<p class="px-4 py-7 text-center text-14 text-text-tertiary">
					{#if !query}
						Type to search
						{#if index}<strong class="font-medium text-text-secondary"
								>{index.byDownloads.length.toLocaleString('en-US')}</strong
							>{/if}
						extensions
					{:else if results}
						No extensions match “{query}”
					{:else if getIndexStatus() === 'failed'}
						Search couldn’t load.
						<a href={searchHref(query)} class="text-accent hover:underline"
							>See all results for “{query}”</a
						>
					{:else}
						Searching…
					{/if}
				</p>
			{/if}
		</div>

		{#if seeAll && results}
			<div class="shrink-0 border-t border-border p-1.5">
				<a
					id={optionId(rows.length)}
					href={searchHref(query)}
					role="option"
					aria-selected={active === rows.length}
					tabindex="-1"
					onmousemove={() => (active = rows.length)}
					class="flex min-h-11 items-center justify-between gap-3 rounded-lg px-2.5 text-13 font-medium text-accent {active ===
					rows.length
						? 'bg-accent-soft'
						: ''}"
				>
					<span class="truncate"
						>See all {results.nbHits.toLocaleString('en-US')} results for “{query}”</span
					>
					<span aria-hidden="true">→</span>
				</a>
			</div>
		{/if}

		<div
			aria-hidden="true"
			class="flex shrink-0 gap-4 border-t border-border px-3.5 py-2 text-11 text-text-tertiary max-sm:hidden"
		>
			<span
				><kbd class="mr-0.5 rounded border border-border px-1 font-mono">↑</kbd><kbd
					class="mr-1 rounded border border-border px-1 font-mono">↓</kbd
				>move</span
			>
			<span><kbd class="mr-1 rounded border border-border px-1 font-mono">↵</kbd>open</span>
			<span><kbd class="mr-1 rounded border border-border px-1 font-mono">esc</kbd>close</span>
		</div>
	</div>
	<p class="sr-only" aria-live="polite">{announcement}</p>
</dialog>
