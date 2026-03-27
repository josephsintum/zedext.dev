<script lang="ts">
	import Sidebar from '$lib/components/Sidebar.svelte';
	import ReadmeRenderer from '$lib/components/ReadmeRenderer.svelte';
	import InstallButton from '$lib/components/InstallButton.svelte';

	let { data } = $props();
	const extension = $derived(data.extension);
	const versions = $derived(data.versions);
	const github = $derived(data.github);
	const readmeHtml = $derived(data.readmeHtml);
	const zedDocsHtml = $derived(data.zedDocsHtml);
	const zedDocsUrl = $derived(data.zedDocsUrl);
	const isMonorepo = $derived(data.isMonorepo);
	const repoOwner = $derived(data.repoOwner);
	const repoOwnerAvatar = $derived(data.repoOwnerAvatar);
	const hasBoth = $derived(zedDocsHtml && readmeHtml);
	let activeTab = $state<'docs' | 'readme'>('docs');
</script>

<svelte:head>
	<title>{extension.name} — ZedExt</title>
	<meta
		name="description"
		content={extension.description ?? `${extension.name} extension for the Zed editor`}
	/>
	<meta property="og:type" content="website" />
	<meta property="og:title" content={`${extension.name} — ZedExt`} />
	<meta
		property="og:description"
		content={extension.description ?? `${extension.name} extension for the Zed editor`}
	/>
	<meta name="twitter:card" content="summary" />
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
				</div>
				{#if extension.description}
					<p class="mt-2 text-[15px] leading-relaxed text-[var(--color-text-secondary)]">
						{extension.description}
					</p>
				{/if}
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
			{#if hasBoth}
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
						<ReadmeRenderer html={zedDocsHtml!} />
					{:else}
						<ReadmeRenderer html={readmeHtml!} />
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
		</div>

		<!-- Sidebar -->
		<div class="w-full shrink-0 lg:w-72 xl:w-80">
			<Sidebar
				{extension}
				{versions}
				{github}
				{isMonorepo}
				{zedDocsUrl}
				{repoOwner}
				{repoOwnerAvatar}
			/>
		</div>
	</div>
</div>
