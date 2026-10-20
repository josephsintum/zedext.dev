<script lang="ts">
	import { untrack } from 'svelte';
	import { replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import { tabKeys } from '$lib/tablist.js';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import ReadmeRenderer from '$lib/components/ReadmeRenderer.svelte';
	import InstallButton from '$lib/components/InstallButton.svelte';
	import VersionTable from '$lib/components/VersionTable.svelte';
	import { badgeFor, healthPills } from '$lib/extension-page.js';
	import { countOf } from '$lib/utils/format.js';
	import { recordRecent } from '$lib/search/recent.js';

	let { data } = $props();
	const extension = $derived(data.extension);
	const versions = $derived(data.versions);
	const isMonorepo = $derived(data.isMonorepo);
	const repoOwner = $derived(data.repoOwner);

	// For the search window's "Recently viewed" (effects only run in the browser)
	$effect(() => recordRecent(extension.id));
	let activeTab = $state<'docs' | 'readme'>('docs');

	// The section tab lives in the URL (?tab=), so it can be linked to and survives a reload.
	// Choosing one updates the URL shallowly: Back still leaves the page rather than the tab.
	// A new extension (a real navigation) starts on Overview.
	type PageTab = 'overview' | 'versions' | 'changelog';
	const requestedTab = $derived(page.state.tab ?? page.url.searchParams.get('tab'));
	const pageTab = $derived<PageTab>(
		requestedTab === 'versions' || (requestedTab === 'changelog' && data.hasChangelog)
			? requestedTab
			: 'overview'
	);
	function choose(tab: PageTab) {
		const url = new URL(location.href);
		if (tab === 'overview') url.searchParams.delete('tab');
		else url.searchParams.set('tab', tab);
		replaceState(url, { ...page.state, tab });
	}
	$effect(() => {
		if (pageTab !== 'changelog') return;
		const id = extension.id;
		// Untracked: loadChangelog reads `changelog`, and re-running on its changes would retry
		// a failed load in a loop. Only opening the tab (or another extension) starts a load
		untrack(() => loadChangelog(id));
	});

	// Fetched on first open, once per extension; a failure can be retried
	let changelog = $state<{
		id: string;
		status: 'loading' | 'ready' | 'none' | 'error';
		html?: string;
		url?: string;
	} | null>(null);
	async function loadChangelog(id: string) {
		if (changelog?.id === id && changelog.status !== 'error') return;
		changelog = { id, status: 'loading' };
		try {
			const res = await fetch(`/extensions/${encodeURIComponent(id)}/changelog`);
			// 404: the changelog went away since the sync saw it; retrying won't help
			if (res.status === 404) {
				if (changelog?.id === id) changelog = { id, status: 'none' };
				return;
			}
			if (!res.ok) throw new Error(String(res.status));
			const body: { html: string; url: string } = await res.json();
			if (changelog?.id === id) changelog = { id, status: 'ready', ...body };
		} catch {
			if (changelog?.id === id) changelog = { id, status: 'error' };
		}
	}

	const content = $derived(data.content);

	const badge = $derived(badgeFor(extension.repository));
	const pills = $derived(healthPills(extension.published_at, content.github?.archived ?? false));
	const tabs = $derived([
		{ id: 'overview' as const, label: 'Overview' },
		{ id: 'versions' as const, label: 'Version History' },
		...(data.hasChangelog ? [{ id: 'changelog' as const, label: 'Changelog' }] : [])
	]);
</script>

<svelte:head>
	<title>{extension.name} — ZedExt</title>
	<meta
		name="description"
		content={extension.description ?? `${extension.name} extension for the Zed editor`}
	/>
	<link rel="canonical" href={`https://zedext.dev/extensions/${extension.id}`} />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="ZedExt" />
	<meta property="og:url" content={`https://zedext.dev/extensions/${extension.id}`} />
	<meta property="og:title" content={`${extension.name} — ZedExt`} />
	<meta
		property="og:description"
		content={extension.description ?? `${extension.name} extension for the Zed editor`}
	/>
	<meta
		property="og:image"
		content={data.themePreview?.length
			? `https://zedext.dev/og?type=theme&id=${encodeURIComponent(extension.id)}&title=${encodeURIComponent(extension.name)}`
			: `https://zedext.dev/og?title=${encodeURIComponent(extension.name)}&description=${encodeURIComponent(extension.description ?? `${extension.name} extension for the Zed editor`)}&type=extension`}
	/>
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<div class="mx-auto max-w-7xl px-6 py-8">
	<!-- Breadcrumb -->
	<nav aria-label="Breadcrumb" class="mb-6 text-13 text-text-tertiary">
		<a href="/extensions" class="hit-y transition-colors hover:text-text">Extensions</a>
		<span class="mx-2" aria-hidden="true">/</span>
		<span class="text-text" aria-current="page">{extension.name}</span>
	</nav>

	<!-- Header -->
	<div class="mb-8">
		<div class="flex flex-wrap items-start gap-4">
			<div class="flex-1">
				<div class="flex items-center gap-3">
					<h1 class="font-mono text-2xl font-bold text-text">{extension.name}</h1>
					<span
						class="rounded-md bg-surface-hover px-2 py-0.5 font-mono text-13 text-text-tertiary"
					>
						v{extension.version}
					</span>
					{#if badge}
						<span
							title={badge.title}
							class="rounded-md border border-accent/40 px-2 py-0.5 text-11 font-semibold text-accent"
						>
							{badge.label}
						</span>
					{/if}
				</div>
				{#if extension.description}
					<p class="mt-2 text-15 leading-relaxed text-text-secondary">
						{extension.description}
					</p>
				{/if}
				<div class="mt-3 flex flex-wrap gap-1.5 text-12">
					{#each pills as pill (pill.label)}
						<span
							class="rounded-full px-2.5 py-0.5 {pill.tone === 'warning'
								? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
								: 'bg-surface-hover text-text-secondary'}"
						>
							{pill.label}
						</span>
					{/each}
				</div>
				<!-- Below lg the sidebar comes after the README, so the key numbers go here too -->
				<div
					class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-13 text-text-secondary tabular-nums lg:hidden"
				>
					<span>{countOf(extension.download_count, 'download')}</span>
					{#if content.github}
						<span>{countOf(content.github.stargazers_count, 'star')}</span>
					{/if}
					{#if extension.repository}
						<a
							href={extension.repository}
							target="_blank"
							rel="noopener noreferrer"
							class="hit-y text-accent hover:underline">Repository ↗</a
						>
					{/if}
				</div>
			</div>

			<!-- Below lg the sidebar's install button is far down the page; touch devices get none -->
			<div class="lg:hidden pointer-coarse:hidden">
				<InstallButton extensionId={extension.id} />
			</div>
		</div>
	</div>

	<!-- Two-column layout -->
	<div class="flex flex-col gap-8 lg:flex-row">
		<!-- Main content -->
		<div class="min-w-0 flex-1">
			<div
				class="mb-5 flex gap-1 border-b border-border"
				role="tablist"
				aria-label="Extension sections"
				{@attach tabKeys}
			>
				{#each tabs as t (t.id)}
					<button
						role="tab"
						id="page-tab-{t.id}-label"
						aria-selected={pageTab === t.id}
						aria-controls="page-tab-{t.id}"
						tabindex={pageTab === t.id ? 0 : -1}
						class="-mb-px px-3 py-2 text-13 font-medium whitespace-nowrap transition-colors sm:px-4 {pageTab ===
						t.id
							? 'border-b-2 border-accent text-text'
							: 'text-text-tertiary hover:text-text-secondary'}"
						onclick={() => choose(t.id)}
					>
						{t.label}
					</button>
				{/each}
			</div>
			<!-- hidden, not removed: the README stays in the server HTML for crawlers -->
			<div
				id="page-tab-overview"
				role="tabpanel"
				aria-labelledby="page-tab-overview-label"
				hidden={pageTab !== 'overview'}
			>
				<!-- Keyed so light/dark and variant choices reset when moving between themes -->
				{#key extension.id}
					{#if data.ThemePreview && data.themePreview}
						<data.ThemePreview variants={data.themePreview} />
					{:else if data.IconThemePreview && data.iconPreview}
						<data.IconThemePreview variants={data.iconPreview} />
					{/if}
				{/key}
				{#if content.zedDocsHtml && content.readmeHtml}
					<div
						class="mb-4 flex gap-1 border-b border-border"
						role="tablist"
						aria-label="Documentation source"
						{@attach tabKeys}
					>
						<button
							role="tab"
							id="tab-docs"
							aria-selected={activeTab === 'docs'}
							aria-controls="tabpanel-docs"
							tabindex={activeTab === 'docs' ? 0 : -1}
							class="px-4 py-2 text-13 font-medium transition-colors {activeTab === 'docs'
								? 'border-b-2 border-accent text-text'
								: 'text-text-tertiary hover:text-text-secondary'}"
							onclick={() => (activeTab = 'docs')}
						>
							Zed Docs
						</button>
						<button
							role="tab"
							id="tab-readme"
							aria-selected={activeTab === 'readme'}
							aria-controls="tabpanel-readme"
							tabindex={activeTab === 'readme' ? 0 : -1}
							class="px-4 py-2 text-13 font-medium transition-colors {activeTab === 'readme'
								? 'border-b-2 border-accent text-text'
								: 'text-text-tertiary hover:text-text-secondary'}"
							onclick={() => (activeTab = 'readme')}
						>
							README
						</button>
					</div>
					<div
						id="tabpanel-{activeTab}"
						role="tabpanel"
						aria-labelledby="tab-{activeTab}"
						class="rounded-lg border border-border bg-surface-raised p-6 md:p-8"
					>
						{#if activeTab === 'docs'}
							<ReadmeRenderer html={content.zedDocsHtml} />
						{:else}
							<ReadmeRenderer html={content.readmeHtml} />
						{/if}
					</div>
				{:else if content.zedDocsHtml}
					<div class="rounded-lg border border-border bg-surface-raised p-6 md:p-8">
						<ReadmeRenderer html={content.zedDocsHtml} />
					</div>
				{:else if content.readmeHtml}
					<div class="rounded-lg border border-border bg-surface-raised p-6 md:p-8">
						<ReadmeRenderer html={content.readmeHtml} />
					</div>
				{:else}
					<div class="rounded-lg border border-border bg-surface-raised p-8 text-center">
						{#if isMonorepo}
							<p class="text-text-secondary">
								This extension is maintained as part of the
								<a
									href="https://github.com/zed-industries/zed"
									target="_blank"
									rel="noopener noreferrer"
									class="font-medium text-accent hover:underline">core Zed repository</a
								>.
							</p>
						{:else}
							<p class="text-text-tertiary">No README available</p>
							{#if extension.repository}
								<a
									href={extension.repository}
									target="_blank"
									rel="noopener noreferrer"
									class="mt-2 inline-block text-13 font-medium text-accent hover:underline"
								>
									View on GitHub
								</a>
							{/if}
						{/if}
					</div>
				{/if}
			</div>
			{#if pageTab === 'versions'}
				<div id="page-tab-versions" role="tabpanel" aria-labelledby="page-tab-versions-label">
					<VersionTable {versions} />
				</div>
			{:else if pageTab === 'changelog'}
				<div id="page-tab-changelog" role="tabpanel" aria-labelledby="page-tab-changelog-label">
					{#if changelog?.id === extension.id && changelog.status === 'ready' && changelog.html}
						<div class="rounded-lg border border-border bg-surface-raised p-6 md:p-8">
							<ReadmeRenderer html={changelog.html} />
						</div>
						<a
							href={changelog.url}
							target="_blank"
							rel="noopener noreferrer"
							class="mt-3 inline-block text-13 text-accent hover:underline"
						>
							Full changelog on GitHub →
						</a>
					{:else if changelog?.id === extension.id && changelog.status === 'none'}
						<p class="text-13 text-text-tertiary">This extension doesn’t have a changelog yet.</p>
					{:else if changelog?.id === extension.id && changelog.status === 'error'}
						<div class="flex flex-wrap items-center gap-3 text-13" role="alert">
							<span class="text-text-secondary">Couldn’t load the changelog.</span>
							<button
								type="button"
								onclick={() => loadChangelog(extension.id)}
								class="min-h-11 rounded-md border border-border px-3 font-medium text-text hover:bg-surface-hover"
							>
								Try Again
							</button>
							{#if extension.repository}
								<a
									href={extension.repository}
									target="_blank"
									rel="noopener noreferrer"
									class="text-accent hover:underline">View on GitHub →</a
								>
							{/if}
						</div>
					{:else}
						<div
							class="space-y-3 rounded-lg border border-border bg-surface-raised p-6 motion-safe:animate-pulse md:p-8"
							role="status"
							aria-label="Loading"
						>
							<div class="h-5 w-1/4 rounded bg-surface-hover"></div>
							<div class="h-3 w-full rounded bg-surface-hover"></div>
							<div class="h-3 w-5/6 rounded bg-surface-hover"></div>
						</div>
					{/if}
				</div>
			{/if}
		</div>

		<!-- Sidebar -->
		<div class="w-full shrink-0 lg:w-72 xl:w-80">
			<Sidebar
				{extension}
				{versions}
				github={content.github}
				{isMonorepo}
				zedDocsUrl={content.zedDocsUrl}
				{repoOwner}
				repoOwnerAvatar={content.repoOwnerAvatar}
			/>
		</div>
	</div>
</div>
