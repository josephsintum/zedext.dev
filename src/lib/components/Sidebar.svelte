<script lang="ts">
	import { copyText } from '$lib/utils/clipboard.js';
	import type { ZedExtension, GitHubRepo } from '$lib/types.js';
	import { firstReleased } from '$lib/extension-page.js';
	import { formatDate, formatNumber, timeAgo } from '$lib/utils/format.js';
	import { parseAuthorNames } from '$lib/utils/parse-author.js';
	import ProvideTag from './ProvideTag.svelte';
	import StatIcon from './StatIcon.svelte';
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
		// If the clipboard is blocked, the id is still visible to select
		if (await copyText(extension.id)) {
			copied = true;
			setTimeout(() => (copied = false), 1500);
		}
	}

	const panel = 'rounded-lg border border-border bg-surface-raised p-4';
	const panelTitle = 'mb-3 text-12 font-semibold tracking-wide text-text-tertiary uppercase';
	const row = 'flex items-center justify-between gap-3 py-1 text-13';
	const link = 'text-text-secondary transition-colors hover:text-accent';
</script>

<aside class="space-y-6">
	<InstallButton extensionId={extension.id} />

	<!-- Downloads -->
	<div class="{panel} flex items-center gap-3">
		<StatIcon name="downloads" class="h-5 w-5 text-accent" />
		<div>
			<div class="font-mono text-2xl font-bold text-text">
				{formatNumber(extension.download_count)}
			</div>
			<div class="text-11 text-text-tertiary">downloads</div>
		</div>
	</div>

	<!-- More info -->
	<section class={panel} aria-labelledby="more-info">
		<h3 id="more-info" class={panelTitle}>More info</h3>
		<div class={row}>
			<span class="text-text-tertiary">Identifier</span>
			<button
				onclick={copyId}
				title="Copy identifier"
				class="min-w-0 truncate font-mono text-12 text-text-secondary hover:text-text"
			>
				{copied ? 'Copied' : extension.id}
			</button>
		</div>
		<div class={row}>
			<span class="text-text-tertiary">Version</span>
			<span class="font-mono text-12 text-text-secondary">{extension.version}</span>
		</div>
		{#if firstReleasedAt}
			<div class={row}>
				<span class="text-text-tertiary">First released</span>
				<span class="text-text-secondary">{formatDate(firstReleasedAt)}</span>
			</div>
		{/if}
		<div class={row}>
			<span class="text-text-tertiary">Last updated</span>
			<span class="text-text-secondary">{formatDate(extension.published_at)}</span>
		</div>
		{#if github?.license}
			<div class={row}>
				<span class="text-text-tertiary">License</span>
				<span class="font-mono text-12 text-text-secondary">{github.license.spdx_id}</span>
			</div>
		{/if}
	</section>

	<!-- Resources -->
	{#if extension.repository || zedDocsUrl || repoOwner}
		<section class={panel} aria-labelledby="resources">
			<h3 id="resources" class={panelTitle}>Resources</h3>
			<ul class="space-y-1.5 text-13">
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
								<span class="text-text-tertiary">({formatNumber(github.open_issues_count)})</span>
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
				<span class="text-text-tertiary">Stars</span>
				<span class="text-text-secondary tabular-nums">{formatNumber(github.stargazers_count)}</span
				>
			</div>
			<div class={row}>
				<span class="text-text-tertiary">Forks</span>
				<span class="text-text-secondary tabular-nums">{formatNumber(github.forks_count)}</span>
			</div>
			<div class={row}>
				<span class="text-text-tertiary">Last commit</span>
				<span class="text-text-secondary">{timeAgo(github.pushed_at)}</span>
			</div>
		</section>
	{/if}

	<!-- Provides -->
	<div>
		<h3 class="mb-2 text-13 font-semibold tracking-wide text-text-tertiary uppercase">Provides</h3>
		<div class="flex flex-wrap gap-1.5">
			{#each extension.provides as provide}
				<ProvideTag {provide} />
			{/each}
		</div>
	</div>

	<!-- Authors -->
	<div>
		<h3 class="mb-2 text-13 font-semibold tracking-wide text-text-tertiary uppercase">Authors</h3>
		<div class="space-y-2">
			{#each authorNames as name, i}
				{#if i === 0 && repoOwner}
					<a
						href="/authors/{repoOwner}"
						class="flex items-center gap-2 text-13 text-text-secondary transition-colors hover:text-accent"
					>
						{#if repoOwnerAvatar}
							<img
								src={repoOwnerAvatar}
								alt={name}
								class="h-6 w-6 rounded-full border border-border"
							/>
						{/if}
						<span>~{repoOwner}</span>
					</a>
				{:else}
					<div class="flex items-center gap-2 text-13 text-text-secondary">
						<div
							class="flex h-6 w-6 items-center justify-center rounded-full bg-surface-hover text-[10px] font-medium text-text-tertiary"
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
