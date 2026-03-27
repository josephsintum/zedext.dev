<script lang="ts">
	import { toggleTheme, getTheme } from '$lib/stores/theme.svelte.js';

	const isDark = $derived(getTheme() === 'dark');
</script>

<header
	class="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-surface-raised)]/90 backdrop-blur-md"
>
	<div class="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
		<a
			href="/"
			class="font-mono text-sm font-semibold tracking-tight text-[var(--color-text)] transition-colors hover:text-[var(--color-accent)]"
		>
			ZedExt
		</a>

		<nav class="flex items-center gap-5">
			<a
				href="https://zed.dev/docs/extensions/developing-extensions"
				target="_blank"
				rel="noopener noreferrer"
				class="text-[13px] font-medium text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text)]"
			>
				Create Extension
				<svg aria-hidden="true" class="inline h-3 w-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7M17 7H7M17 7v10"/></svg>
			</a>
			<a
				href="https://zed.dev"
				target="_blank"
				rel="noopener noreferrer"
				class="text-[13px] font-medium text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text)]"
			>
				Zed Editor
				<svg aria-hidden="true" class="inline h-3 w-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7M17 7H7M17 7v10"/></svg>
			</a>
			<button
				onclick={toggleTheme}
				aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
				class="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:outline-none"
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
		</nav>
	</div>
</header>
