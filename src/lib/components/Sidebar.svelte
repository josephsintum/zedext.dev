<script lang="ts">
	import type { ZedExtension, GitHubRepo } from '$lib/types.js';
	import { firstReleased } from '$lib/extension-page.js';
	import { formatDate, formatNumber, timeAgo } from '$lib/utils/format.js';
	import { parseAuthorNames } from '$lib/utils/parse-author.js';
	import ProvideTag from './ProvideTag.svelte';
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
	const firstReleasedAt = $derived(firstReleased(versions));

	let copied = $state(false);
	async function copyId() {
		try {
			await navigator.clipboard.writeText(extension.id);
			copied = true;
			setTimeout(() => (copied = false), 1500);
		} catch {
			// Clipboard blocked: the id is still visible to select
		}
	}

	const panel =
		'rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4';
	const panelTitle =
		'mb-3 text-[12px] font-semibold tracking-wide text-[var(--color-text-tertiary)] uppercase';
	const row = 'flex items-center justify-between gap-3 py-1 text-[13px]';
	const link =
		'text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-accent)]';
</script>

<aside class="space-y-6">
	<InstallButton extensionId={extension.id} />

	<!-- Downloads -->
	<div class="{panel} flex items-center gap-3">
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

	<!-- More info -->
	<section class={panel} aria-labelledby="more-info">
		<h3 id="more-info" class={panelTitle}>More info</h3>
		<div class={row}>
			<span class="text-[var(--color-text-tertiary)]">Identifier</span>
			<button
				onclick={copyId}
				title="Copy identifier"
				class="min-w-0 truncate font-mono text-[12px] text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
			>
				{copied ? 'Copied' : extension.id}
			</button>
		</div>
		<div class={row}>
			<span class="text-[var(--color-text-tertiary)]">Version</span>
			<span class="font-mono text-[12px] text-[var(--color-text-secondary)]"
				>{extension.version}</span
			>
		</div>
		{#if firstReleasedAt}
			<div class={row}>
				<span class="text-[var(--color-text-tertiary)]">First released</span>
				<span class="text-[var(--color-text-secondary)]">{formatDate(firstReleasedAt)}</span>
			</div>
		{/if}
		<div class={row}>
			<span class="text-[var(--color-text-tertiary)]">Last updated</span>
			<span class="text-[var(--color-text-secondary)]">{formatDate(extension.published_at)}</span>
		</div>
		{#if github?.license}
			<div class={row}>
				<span class="text-[var(--color-text-tertiary)]">License</span>
				<span class="font-mono text-[12px] text-[var(--color-text-secondary)]"
					>{github.license.spdx_id}</span
				>
			</div>
		{/if}
	</section>

	<!-- Resources -->
	{#if extension.repository || zedDocsUrl || repoOwner}
		<section class={panel} aria-labelledby="resources">
			<h3 id="resources" class={panelTitle}>Resources</h3>
			<ul class="space-y-1.5 text-[13px]">
				{#if extension.repository}
					<li>
						<a href={extension.repository} target="_blank" rel="noopener noreferrer" class={link}
							>Repository ↗</a
						>
					</li>
					<li>
						<a
							href="{extension.repository}/issues"
							target="_blank"
							rel="noopener noreferrer"
							class={link}
						>
							Issues
							{#if github && !isMonorepo}
								<span class="text-[var(--color-text-tertiary)]"
									>({formatNumber(github.open_issues_count)})</span
								>
							{/if}
							↗
						</a>
					</li>
				{/if}
				{#if zedDocsUrl}
					<li>
						<a href={zedDocsUrl} target="_blank" rel="noopener noreferrer" class={link}
							>Zed docs ↗</a
						>
					</li>
				{/if}
				{#if repoOwner && !isMonorepo}
					<li><a href="/authors/{repoOwner}" class={link}>More from {repoOwner}</a></li>
				{/if}
			</ul>
		</section>
	{/if}

	<!-- GitHub -->
	{#if github && !isMonorepo}
		<section class={panel} aria-labelledby="github-stats">
			<h3 id="github-stats" class={panelTitle}>GitHub</h3>
			<div class={row}>
				<span class="text-[var(--color-text-tertiary)]">Stars</span>
				<span class="text-[var(--color-text-secondary)] tabular-nums"
					>{formatNumber(github.stargazers_count)}</span
				>
			</div>
			<div class={row}>
				<span class="text-[var(--color-text-tertiary)]">Forks</span>
				<span class="text-[var(--color-text-secondary)] tabular-nums"
					>{formatNumber(github.forks_count)}</span
				>
			</div>
			<div class={row}>
				<span class="text-[var(--color-text-tertiary)]">Last commit</span>
				<span class="text-[var(--color-text-secondary)]">{timeAgo(github.pushed_at)}</span>
			</div>
		</section>
	{/if}

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
