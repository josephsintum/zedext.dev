<script lang="ts">
	import type { ZedExtension, GitHubRepo } from '$lib/types.js';
	import { formatNumber, timeAgo } from '$lib/utils/format.js';
	import { parseAuthorNames } from '$lib/utils/parse-author.js';
	import ProvideTag from './ProvideTag.svelte';
	import VersionHistory from './VersionHistory.svelte';
	import InstallButton from './InstallButton.svelte';

	let {
		extension,
		versions,
		github,
		isMonorepo = false,
		zedDocsUrl = null,
		repoOwner = null,
		repoOwnerAvatar = null
	}: {
		extension: ZedExtension;
		versions: ZedExtension[];
		github: GitHubRepo | null;
		isMonorepo?: boolean;
		zedDocsUrl?: string | null;
		repoOwner?: string | null;
		repoOwnerAvatar?: string | null;
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
				<svg aria-hidden="true" class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
					<path
						d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
					/>
				</svg>
				View Repository
			</a>
		{/if}
		{#if extension.repository}
			<a
				href="{extension.repository}/issues"
				target="_blank"
				rel="noopener noreferrer"
				class="mt-2 flex items-center gap-1.5 text-[13px] font-medium text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text)]"
			>
				<svg aria-hidden="true" class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
					<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
				</svg>
				Issues
				{#if github && !isMonorepo && github.open_issues_count > 0}
					<span class="text-[11px] text-[var(--color-text-tertiary)]">({github.open_issues_count})</span>
				{/if}
			</a>
		{/if}
		{#if zedDocsUrl}
			<a
				href={zedDocsUrl}
				target="_blank"
				rel="noopener noreferrer"
				class="mt-2 flex items-center gap-1.5 text-[13px] font-medium text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text)]"
			>
				<svg
					aria-hidden="true"
					class="h-4 w-4"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					stroke-width="2"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
					/>
				</svg>
				Zed Docs
			</a>
		{/if}
	</div>

	<!-- Stats -->
	<div class="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4">
		<!-- Downloads — prominent -->
		<div class="flex items-center gap-3">
			<svg
				class="h-5 w-5 text-[var(--color-accent)]"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
				stroke-width="1.5"
				aria-hidden="true"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
				/>
			</svg>
			<div>
				<div class="font-mono text-2xl font-bold text-[var(--color-text)]">
					{formatNumber(extension.download_count)}
				</div>
				<div class="text-[11px] text-[var(--color-text-tertiary)]">downloads</div>
			</div>
		</div>

		<!-- Stars, forks, issues — compact row -->
		{#if github && !isMonorepo}
			<div
				class="mt-3 flex items-center justify-between border-t border-[var(--color-border)] pt-3 text-[12px] text-[var(--color-text-tertiary)]"
			>
				<span class="flex items-center gap-1 tabular-nums">
					<svg
						class="h-3.5 w-3.5"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						stroke-width="1.5"
						aria-hidden="true"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
						/>
					</svg>
					{formatNumber(github.stargazers_count)}
				</span>
				<span class="flex items-center gap-1 tabular-nums">
					<svg
						class="h-3.5 w-3.5"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						stroke-width="1.5"
						aria-hidden="true"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z"
						/>
					</svg>
					{formatNumber(github.forks_count)}
				</span>
				<span class="flex items-center gap-1 tabular-nums">
					<svg
						class="h-3.5 w-3.5"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						stroke-width="1.5"
						aria-hidden="true"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
						/>
					</svg>
					{formatNumber(github.open_issues_count)}
				</span>
			</div>
		{/if}
	</div>

	<!-- Metadata -->
	<div class="space-y-2.5 text-[13px]">
		{#if github?.license}
			<div class="flex items-center justify-between">
				<span class="text-[var(--color-text-tertiary)]">License</span>
				<span
					class="rounded-md bg-[var(--color-surface)] px-2 py-0.5 font-mono text-[12px] text-[var(--color-text-secondary)]"
				>
					{github.license.spdx_id}
				</span>
			</div>
		{/if}
		<div class="flex items-center justify-between">
			<span class="text-[var(--color-text-tertiary)]">Updated</span>
			<span class="text-[var(--color-text-secondary)]">{timeAgo(extension.published_at)}</span>
		</div>
		{#if extension.wasm_api_version}
			<div class="flex items-center justify-between">
				<span class="text-[var(--color-text-tertiary)]">WASM API</span>
				<span class="font-mono text-[12px] text-[var(--color-text-secondary)]"
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

	<!-- Version History -->
	<VersionHistory {versions} />

	<!-- Authors -->
	<div>
		<h3
			class="mb-2 text-[13px] font-semibold tracking-wide text-[var(--color-text-tertiary)] uppercase"
		>
			Authors
		</h3>
		<div class="space-y-2">
			{#each authorNames as name, i}
				{#if i === 0 && repoOwner}
					<a
						href="/authors/{repoOwner}"
						class="flex items-center gap-2 text-[13px] text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-accent)]"
					>
						{#if repoOwnerAvatar}
							<img
								src={repoOwnerAvatar}
								alt={name}
								class="h-6 w-6 rounded-full border border-[var(--color-border)]"
							/>
						{/if}
						<span>~{repoOwner}</span>
					</a>
				{:else}
					<div class="flex items-center gap-2 text-[13px] text-[var(--color-text-secondary)]">
						<div
							class="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-surface-hover)] text-[10px] font-medium text-[var(--color-text-tertiary)]"
						>
							{name.charAt(0).toUpperCase()}
						</div>
						<span>{name}</span>
					</div>
				{/if}
			{/each}
		</div>
	</div>
</aside>
