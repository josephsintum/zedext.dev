<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { toggleTheme, getTheme } from '$lib/stores/theme.svelte.js';

	const isDark = $derived(getTheme() === 'dark');
	// Phones show what fits in the bar (`hide` drops the rest); the phone menu lists them all
	const siteLinks = [
		{ href: '/extensions', label: 'All extensions', hide: '' },
		{ href: '/themes', label: 'Themes', hide: 'max-[359px]:hidden' },
		{ href: '/languages', label: 'Languages', hide: 'max-sm:hidden' }
	];

	let menu: HTMLElement;
	// Links don't close a popover on their own. Browsers without popovers (Safari 16 and older)
	// never show the menu, and matches(':popover-open') would throw there
	function closeMenu() {
		if (menu && 'hidePopover' in menu && menu.matches(':popover-open')) menu.hidePopover();
	}
	afterNavigate(closeMenu);
</script>

<header class="border-border bg-surface-raised/90 sticky top-0 z-50 border-b backdrop-blur-md">
	<div class="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
		<a
			href="/"
			class="hit-y text-text hover:text-accent font-mono text-sm font-semibold tracking-tight transition-colors"
		>
			ZedExt
		</a>

		<nav class="flex items-center gap-3 sm:gap-5">
			{#each siteLinks as link (link.href)}
				{@const current = page.url.pathname === link.href}
				<a
					href={link.href}
					aria-current={current ? 'page' : undefined}
					class="hit-y hover:text-text text-13 font-medium whitespace-nowrap transition-colors {current
						? 'text-text'
						: 'text-text-secondary'} {link.hide}"
				>
					{link.label}
				</a>
			{/each}
			<button
				onclick={toggleTheme}
				aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
				class="text-text-secondary hover:bg-surface-hover hover:text-text focus-visible:ring-accent flex h-11 w-11 items-center justify-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:outline-none sm:h-8 sm:w-8"
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
				class="text-text-secondary hover:bg-surface-hover hover:text-text -mr-2 hidden h-11 w-11 items-center justify-center rounded-lg transition-colors max-sm:supports-[selector(:popover-open)]:flex"
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
				class="border-border bg-surface-raised text-14 inset-auto top-14 right-4 m-0 hidden w-56 rounded-lg border p-1 shadow-lg max-sm:open:block"
			>
				{#each siteLinks as link (link.href)}
					<a
						href={link.href}
						aria-current={page.url.pathname === link.href ? 'page' : undefined}
						class="text-text hover:bg-surface-hover flex min-h-11 items-center rounded-md px-3"
					>
						{link.label}
					</a>
				{/each}
				<a
					href="/about"
					class="text-text hover:bg-surface-hover flex min-h-11 items-center rounded-md px-3"
				>
					About
				</a>
			</div>
		</nav>
	</div>
</header>
