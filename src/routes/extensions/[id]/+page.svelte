<script lang="ts">
	import Sidebar from '$lib/components/Sidebar.svelte';
	import ReadmeRenderer from '$lib/components/ReadmeRenderer.svelte';
	import InstallButton from '$lib/components/InstallButton.svelte';
	import ThemePreview from '$lib/components/ThemePreview.svelte';
	import IconThemePreview from '$lib/components/IconThemePreview.svelte';
	import VersionTable from '$lib/components/VersionTable.svelte';
	import { badgeFor, healthPills } from '$lib/extension-page.js';
	import type { DetailContent } from './+page.server.js';

	let { data } = $props();
	const extension = $derived(data.extension);
	const versions = $derived(data.versions);
	const isMonorepo = $derived(data.isMonorepo);
	const repoOwner = $derived(data.repoOwner);
	let activeTab = $state<'docs' | 'readme'>('docs');
	// Resets to Overview when moving to another extension (same pattern as ExtensionBrowser)
	type PageTab = 'overview' | 'versions' | 'changelog';
	let chosen = $state<{ id: string; tab: PageTab }>({ id: '', tab: 'overview' });
	const pageTab = $derived(chosen.id === extension.id ? chosen.tab : 'overview');
	const choose = (tab: PageTab) => {
		chosen = { id: extension.id, tab };
		if (tab === 'changelog') loadChangelog(extension.id);
	};

	// Fetched on first open, once per extension; a failure can be retried by reopening
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

	// The sidebar stays mounted (keeping its own state) and fills in when streamed content
	// arrives. Full page loads deliver content inline, so it's there during SSR too.
	let streamed = $state<DetailContent | null>(null);
	$effect(() => {
		const pending = data.content;
		streamed = null;
		if (pending instanceof Promise) {
			pending.then((c) => {
				if (data.content === pending) streamed = c;
			});
		}
	});
	const content = $derived(data.content instanceof Promise ? streamed : data.content);

	const badge = $derived(badgeFor(extension.repository));
	const pills = $derived(healthPills(extension.published_at, content?.github?.archived ?? false));
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
	<nav class="mb-6 text-[13px] text-[var(--color-text-tertiary)]">
		<a href="/" class="transition-colors hover:text-[var(--color-text)]">Extensions</a>
		<span class="mx-2">/</span>
		<span class="text-[var(--color-text)]">{extension.name}</span>
	</nav>

	<!-- Header -->
	<div class="mb-8">
		<div class="flex flex-wrap items-start gap-4">
			<div class="flex-1">
				<div class="flex items-center gap-3">
					<h1 class="font-mono text-2xl font-bold text-[var(--color-text)]">{extension.name}</h1>
					<span
						class="rounded-md bg-[var(--color-surface-hover)] px-2 py-0.5 font-mono text-[13px] text-[var(--color-text-tertiary)]"
					>
						v{extension.version}
					</span>
					{#if badge}
						<span
							title={badge.title}
							class="rounded-md border border-[var(--color-accent)]/40 px-2 py-0.5 text-[11px] font-semibold text-[var(--color-accent)]"
						>
							{badge.label}
						</span>
					{/if}
				</div>
				{#if extension.description}
					<p class="mt-2 text-[15px] leading-relaxed text-[var(--color-text-secondary)]">
						{extension.description}
					</p>
				{/if}
				<div class="mt-3 flex flex-wrap gap-1.5 text-[12px]">
					{#each pills as pill (pill.label)}
						<span
							class="rounded-full px-2.5 py-0.5 {pill.tone === 'warning'
								? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
								: 'bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)]'}"
						>
							{pill.label}
						</span>
					{/each}
				</div>
			</div>

			<!-- Mobile install button (hidden on lg+) -->
			<div class="lg:hidden">
				<InstallButton extensionId={extension.id} />
			</div>
		</div>
	</div>

	<!-- Two-column layout -->
	<div class="flex flex-col gap-8 lg:flex-row">
		<!-- Main content -->
		<div class="min-w-0 flex-1">
			<div
				class="mb-5 flex gap-1 border-b border-[var(--color-border)]"
				role="tablist"
				aria-label="Extension sections"
			>
				{#each tabs as t (t.id)}
					<button
						role="tab"
						aria-selected={pageTab === t.id}
						aria-controls="page-tab-{t.id}"
						class="-mb-px px-3 py-2 text-[13px] font-medium whitespace-nowrap transition-colors sm:px-4 {pageTab ===
						t.id
							? 'border-b-2 border-[var(--color-accent)] text-[var(--color-text)]'
							: 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'}"
						onclick={() => choose(t.id)}
					>
						{t.label}
					</button>
				{/each}
			</div>
			<!-- hidden, not removed: the README stays in the server HTML for crawlers -->
			<div id="page-tab-overview" role="tabpanel" hidden={pageTab !== 'overview'}>
				<!-- Keyed so light/dark and variant choices reset when moving between themes -->
				{#key extension.id}
					{#if data.themePreview?.length}
						<ThemePreview variants={data.themePreview} />
					{:else if data.iconPreview?.length}
						<IconThemePreview variants={data.iconPreview} />
					{/if}
				{/key}
				{#await data.content}
					<div
						class="animate-pulse space-y-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-6 md:p-8"
						aria-busy="true"
					>
						<div class="h-5 w-1/3 rounded bg-[var(--color-surface-hover)]"></div>
						<div class="h-3 w-full rounded bg-[var(--color-surface-hover)]"></div>
						<div class="h-3 w-5/6 rounded bg-[var(--color-surface-hover)]"></div>
						<div class="h-3 w-2/3 rounded bg-[var(--color-surface-hover)]"></div>
					</div>
				{:then { readmeHtml, zedDocsHtml }}
					{#if zedDocsHtml && readmeHtml}
						<div class="mb-4 flex gap-1 border-b border-[var(--color-border)]" role="tablist">
							<button
								role="tab"
								aria-selected={activeTab === 'docs'}
								aria-controls="tabpanel-docs"
								class="px-4 py-2 text-[13px] font-medium transition-colors {activeTab === 'docs'
									? 'border-b-2 border-[var(--color-accent)] text-[var(--color-text)]'
									: 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'}"
								onclick={() => (activeTab = 'docs')}
							>
								Zed Docs
							</button>
							<button
								role="tab"
								aria-selected={activeTab === 'readme'}
								aria-controls="tabpanel-readme"
								class="px-4 py-2 text-[13px] font-medium transition-colors {activeTab === 'readme'
									? 'border-b-2 border-[var(--color-accent)] text-[var(--color-text)]'
									: 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'}"
								onclick={() => (activeTab = 'readme')}
							>
								README
							</button>
						</div>
						<div
							id="tabpanel-{activeTab}"
							role="tabpanel"
							class="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-6 md:p-8"
						>
							{#if activeTab === 'docs'}
								<ReadmeRenderer html={zedDocsHtml} />
							{:else}
								<ReadmeRenderer html={readmeHtml} />
							{/if}
						</div>
					{:else if zedDocsHtml}
						<div
							class="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-6 md:p-8"
						>
							<ReadmeRenderer html={zedDocsHtml} />
						</div>
					{:else if readmeHtml}
						<div
							class="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-6 md:p-8"
						>
							<ReadmeRenderer html={readmeHtml} />
						</div>
					{:else}
						<div
							class="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-8 text-center"
						>
							{#if isMonorepo}
								<p class="text-[var(--color-text-secondary)]">
									This extension is maintained as part of the
									<a
										href="https://github.com/zed-industries/zed"
										target="_blank"
										rel="noopener noreferrer"
										class="font-medium text-[var(--color-accent)] hover:underline"
										>core Zed repository</a
									>.
								</p>
							{:else}
								<p class="text-[var(--color-text-tertiary)]">No README available</p>
								{#if extension.repository}
									<a
										href={extension.repository}
										target="_blank"
										rel="noopener noreferrer"
										class="mt-2 inline-block text-[13px] font-medium text-[var(--color-accent)] hover:underline"
									>
										View on GitHub
									</a>
								{/if}
							{/if}
						</div>
					{/if}
				{/await}
			</div>
			{#if pageTab === 'versions'}
				<div id="page-tab-versions" role="tabpanel">
					<VersionTable {versions} />
				</div>
			{:else if pageTab === 'changelog'}
				<div id="page-tab-changelog" role="tabpanel">
					{#if changelog?.id === extension.id && changelog.status === 'ready' && changelog.html}
						<div
							class="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-6 md:p-8"
						>
							<ReadmeRenderer html={changelog.html} />
						</div>
						<a
							href={changelog.url}
							target="_blank"
							rel="noopener noreferrer"
							class="mt-3 inline-block text-[13px] text-[var(--color-accent)] hover:underline"
						>
							Full changelog on GitHub →
						</a>
					{:else if changelog?.id === extension.id && changelog.status === 'none'}
						<p class="text-[13px] text-[var(--color-text-tertiary)]">
							This extension doesn't have a changelog yet.
						</p>
					{:else if changelog?.id === extension.id && changelog.status === 'error'}
						<p class="text-[13px] text-[var(--color-text-tertiary)]">
							Couldn't load the changelog right now.
							{#if extension.repository}
								<a
									href={extension.repository}
									target="_blank"
									rel="noopener noreferrer"
									class="text-[var(--color-accent)] hover:underline">View it on GitHub →</a
								>
							{/if}
						</p>
					{:else}
						<div
							class="animate-pulse space-y-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-6 md:p-8"
							aria-busy="true"
						>
							<div class="h-5 w-1/4 rounded bg-[var(--color-surface-hover)]"></div>
							<div class="h-3 w-full rounded bg-[var(--color-surface-hover)]"></div>
							<div class="h-3 w-5/6 rounded bg-[var(--color-surface-hover)]"></div>
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
				github={content?.github ?? null}
				{isMonorepo}
				zedDocsUrl={content?.zedDocsUrl ?? null}
				{repoOwner}
				repoOwnerAvatar={content?.repoOwnerAvatar ?? null}
			/>
		</div>
	</div>
</div>
