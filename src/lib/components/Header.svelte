<script lang="ts">
	import { onMount } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { toggleTheme, getTheme } from '$lib/stores/theme.svelte.js';
	import { loadIndex } from '$lib/search/client.svelte.js';
	import { isApplePlatform, isTypingTarget } from '$lib/search/palette.js';
	import SearchDialog from './SearchDialog.svelte';

	const isDark = $derived(getTheme() === 'dark');
	// Phones show what fits in the bar (`hide` drops the rest); the phone menu lists them all.
	// Below 400px Themes, and below 360px All extensions, make room for the search button
	const siteLinks = [
		{ href: '/extensions', label: 'All extensions', hide: 'max-[359px]:hidden' },
		{ href: '/themes', label: 'Themes', hide: 'max-[399px]:hidden' },
		{ href: '/languages', label: 'Languages', hide: 'max-sm:hidden' }
	];

	let menu: HTMLElement;
	// Links don't close a popover on their own. Browsers without popovers (Safari 16 and older)
	// never show the menu, and matches(':popover-open') would throw there
	function closeMenu() {
		if (menu && 'hidePopover' in menu && menu.matches(':popover-open')) menu.hidePopover();
	}
	afterNavigate(closeMenu);

	let search: ReturnType<typeof SearchDialog>;

	// ⌘K until hydration; Windows and Linux then show Ctrl K
	let apple = $state(true);
	onMount(() => {
		const nav = navigator as Navigator & { userAgentData?: { platform: string } };
		apple = isApplePlatform(nav.userAgentData?.platform || nav.platform);
	});

	// ⌘K / Ctrl+K anywhere, and "/" when not typing: the page's own search box if it has one
	// (SearchBar's), otherwise the search window. ⌘K again closes the window
	function handleKeydown(e: KeyboardEvent) {
		const commandK =
			e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey;
		const slash =
			e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey && !isTypingTarget(e.target);
		if (!commandK && !slash) return;
		e.preventDefault();
		if (commandK && search.isOpen()) return search.close();
		const pageSearch = document.querySelector<HTMLElement>('[data-page-search] input');
		if (pageSearch) pageSearch.focus();
		else search.open();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#snippet magnifier(size: string)}
	<svg
		aria-hidden="true"
		class="{size} shrink-0"
		fill="none"
		stroke="currentColor"
		viewBox="0 0 24 24"
		stroke-width="2"
		stroke-linecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg
	>
{/snippet}

<header class="sticky top-0 z-50 border-b border-border bg-surface-raised/90 backdrop-blur-md">
	<div class="mx-auto flex h-14 max-w-7xl items-center justify-between gap-6 px-6">
		<div class="flex min-w-0 flex-1 items-center gap-6">
			<a
				href="/"
				class="hit-y font-mono text-sm font-semibold tracking-tight text-text transition-colors hover:text-accent"
			>
				ZedExt
			</a>
			<button
				type="button"
				onclick={() => search.open()}
				onpointerenter={() => loadIndex()}
				onfocus={() => loadIndex()}
				aria-keyshortcuts="Meta+K Control+K /"
				class="header-search flex h-8 w-full max-w-[260px] min-w-0 items-center gap-2 rounded-lg border border-border bg-surface pr-1.5 pl-2.5 text-13 text-text-tertiary transition-colors hover:border-border-hover hover:text-text-secondary focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none max-sm:hidden"
			>
				{@render magnifier('h-[15px] w-[15px]')}
				<span class="flex-1 truncate text-left">Search extensions…</span>
				<kbd
					aria-hidden="true"
					class="shrink-0 rounded border border-border bg-surface-raised px-1.5 font-mono text-11 text-text-tertiary"
					>{apple ? '⌘K' : 'Ctrl K'}</kbd
				>
			</button>
		</div>

		<nav class="flex items-center gap-3 sm:gap-5">
			{#each siteLinks as link (link.href)}
				{@const current = page.url.pathname === link.href}
				<a
					href={link.href}
					aria-current={current ? 'page' : undefined}
					class="hit-y text-13 font-medium whitespace-nowrap transition-colors hover:text-text {current
						? 'text-text'
						: 'text-text-secondary'} {link.hide}"
				>
					{link.label}
				</a>
			{/each}
			<button
				type="button"
				onclick={() => search.open()}
				aria-label="Search extensions"
				class="header-search flex h-11 w-11 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-hover hover:text-text focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none sm:hidden"
			>
				{@render magnifier('h-[18px] w-[18px]')}
			</button>
			<button
				onclick={toggleTheme}
				aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
				class="flex h-11 w-11 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-hover hover:text-text focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none sm:h-8 sm:w-8"
			>
				{#if isDark}
					<svg
						aria-hidden="true"
						class="h-4 w-4"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<circle cx="12" cy="12" r="5" />
						<line x1="12" y1="1" x2="12" y2="3" />
						<line x1="12" y1="21" x2="12" y2="23" />
						<line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
						<line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
						<line x1="1" y1="12" x2="3" y2="12" />
						<line x1="21" y1="12" x2="23" y2="12" />
						<line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
						<line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
					</svg>
				{:else}
					<svg
						aria-hidden="true"
						class="h-4 w-4"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
					</svg>
				{/if}
			</button>
			<!-- Phones: every link, in a native popover (closes on outside tap or Esc).
				Only where popovers are supported; elsewhere neither the button nor the menu shows -->
			<button
				popovertarget="site-menu"
				aria-label="More links"
				class="-mr-2 hidden h-11 w-11 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-hover hover:text-text max-sm:supports-[selector(:popover-open)]:flex"
			>
				<svg
					aria-hidden="true"
					class="h-5 w-5"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
					stroke-width="2"
					stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg
				>
			</button>
			<div
				bind:this={menu}
				id="site-menu"
				popover
				class="inset-auto top-14 right-4 m-0 hidden w-56 rounded-lg border border-border bg-surface-raised p-1 text-14 shadow-lg max-sm:open:block"
			>
				{#each siteLinks as link (link.href)}
					<a
						href={link.href}
						aria-current={page.url.pathname === link.href ? 'page' : undefined}
						class="flex min-h-11 items-center rounded-md px-3 text-text hover:bg-surface-hover"
					>
						{link.label}
					</a>
				{/each}
				<a
					href="/about"
					class="flex min-h-11 items-center rounded-md px-3 text-text hover:bg-surface-hover"
				>
					About
				</a>
			</div>
		</nav>
	</div>
</header>

<SearchDialog bind:this={search} />
