<script lang="ts">
	import type { ZedExtension, GitHubRepo } from '$lib/types.js';
	import { formatNumber, timeAgo, formatDate } from '$lib/utils/format.js';
	function parseAuthorNames(authors: string[]): string[] {
		return authors.map((a) => {
			const match = a.match(/^(.+?)\s*<[^>]+>$/);
			return match ? match[1].trim() : a.trim();
		});
	}
	import ProvideTag from './ProvideTag.svelte';
	import VersionHistory from './VersionHistory.svelte';
	import InstallButton from './InstallButton.svelte';

	let {
		extension,
		versions,
		github,
		isMonorepo = false
	}: {
		extension: ZedExtension;
		versions: ZedExtension[];
		github: GitHubRepo | null;
		isMonorepo?: boolean;
	} = $props();

	const authorNames = $derived(parseAuthorNames(extension.authors));
</script>

<aside class="space-y-6">
	<!-- Install -->
	<div>
		<InstallButton extensionId={extension.id} />
		{#if extension.repository}
			<a
				href={extension.repository}
				target="_blank"
				rel="noopener noreferrer"
				class="mt-2 flex items-center gap-1.5 text-[13px] font-medium text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text)]"
			>
				<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
					<path
						d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
					/>
				</svg>
				View Repository
			</a>
		{/if}
	</div>

	<!-- Stats -->
	<div class="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4">
		<div class="grid grid-cols-2 gap-4">
			<div>
				<div class="text-[12px] text-[var(--color-text-tertiary)]">Downloads</div>
				<div class="font-mono text-[15px] font-semibold text-[var(--color-text)]">
					{formatNumber(extension.download_count)}
				</div>
			</div>

			{#if github && !isMonorepo}
				<div>
					<div class="text-[12px] text-[var(--color-text-tertiary)]">Stars</div>
					<div class="font-mono text-[15px] font-semibold text-[var(--color-text)]">
						{formatNumber(github.stargazers_count)}
					</div>
				</div>
				<div>
					<div class="text-[12px] text-[var(--color-text-tertiary)]">Forks</div>
					<div class="font-mono text-[15px] font-semibold text-[var(--color-text)]">
						{formatNumber(github.forks_count)}
					</div>
				</div>
				<div>
					<div class="text-[12px] text-[var(--color-text-tertiary)]">Issues</div>
					<div class="font-mono text-[15px] font-semibold text-[var(--color-text)]">
						{formatNumber(github.open_issues_count)}
					</div>
				</div>
			{/if}
		</div>
	</div>

	<!-- Metadata -->
	<div class="space-y-3 text-[13px]">
		{#if github?.license}
			<div>
				<span class="text-[var(--color-text-tertiary)]">License</span>
				<span
					class="ml-2 rounded-md bg-[var(--color-surface)] px-2 py-0.5 font-mono text-[12px] text-[var(--color-text-secondary)]"
					>{github.license.spdx_id}</span
				>
			</div>
		{/if}

		<div>
			<span class="text-[var(--color-text-tertiary)]">Updated</span>
			<span class="ml-2 text-[var(--color-text-secondary)]">{timeAgo(extension.published_at)}</span>
		</div>

		{#if extension.wasm_api_version}
			<div>
				<span class="text-[var(--color-text-tertiary)]">WASM API</span>
				<span class="ml-2 font-mono text-[12px] text-[var(--color-text-secondary)]"
					>v{extension.wasm_api_version}</span
				>
			</div>
		{/if}
	</div>

	<!-- Provides -->
	<div>
		<h3
			class="mb-2 text-[13px] font-semibold tracking-wide text-[var(--color-text-tertiary)] uppercase"
		>
			Provides
		</h3>
		<div class="flex flex-wrap gap-1.5">
			{#each extension.provides as provide}
				<ProvideTag {provide} />
			{/each}
		</div>
	</div>

	<!-- Authors -->
	<div>
		<h3
			class="mb-2 text-[13px] font-semibold tracking-wide text-[var(--color-text-tertiary)] uppercase"
		>
			Authors
		</h3>
		<div class="space-y-1">
			{#each authorNames as name}
				<div class="text-[13px] text-[var(--color-text-secondary)]">{name}</div>
			{/each}
		</div>
	</div>

	<!-- Version History -->
	<VersionHistory {versions} />
</aside>
