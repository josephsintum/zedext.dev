<script lang="ts">
	import { timeAgo } from '$lib/utils/format.js';

	/** When the extension data was last synced; null hides the line */
	let { updatedAt = null }: { updatedAt?: string | null } = $props();

	const externalLinks = [
		{ href: 'https://zed.dev/docs/extensions/developing-extensions', label: 'Create Extension' },
		{ href: 'https://zed.dev', label: 'Zed Editor' },
		{ href: 'https://github.com/josephsintum/zedext.dev', label: 'GitHub' }
	];
</script>

<footer class="border-border mt-auto border-t">
	<div
		class="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row"
	>
		<div class="text-text-tertiary text-center text-[13px] sm:text-left">
			<div class="flex flex-wrap items-center justify-center gap-x-2 sm:justify-start">
				<span class="font-mono font-medium">ZedExt</span>
				<span class="text-border" aria-hidden="true">/</span>
				<span>An unofficial community project. Not affiliated with Zed Industries.</span>
			</div>
			{#if updatedAt}
				<p class="mt-1 text-[12px]">
					Data from Zed’s extension registry and GitHub · updated
					<time datetime={updatedAt} title={new Date(updatedAt).toUTCString()}
						>{timeAgo(updatedAt)}</time
					>
				</p>
			{/if}
		</div>

		<div class="text-text-tertiary flex flex-wrap items-center justify-center gap-x-4 text-[12px]">
			<a
				href="/about"
				class="hover:text-text-secondary inline-flex min-h-11 items-center whitespace-nowrap transition-colors"
			>
				About
			</a>
			{#each externalLinks as link (link.href)}
				<span class="text-border" aria-hidden="true">&middot;</span>
				<a
					href={link.href}
					class="hover:text-text-secondary inline-flex min-h-11 items-center whitespace-nowrap transition-colors"
					target="_blank"
					rel="noopener noreferrer"
				>
					{link.label}<svg
						aria-hidden="true"
						class="ml-0.5 inline h-2.5 w-2.5 opacity-50"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						stroke-width="2.5"
						stroke-linecap="round"
						stroke-linejoin="round"><path d="M7 17L17 7M17 7H7M17 7v10" /></svg
					>
				</a>
			{/each}
		</div>
	</div>
</footer>
