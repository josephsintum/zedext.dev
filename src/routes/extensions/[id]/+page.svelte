<script lang="ts">
	import ProvideTag from '$lib/components/ProvideTag.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import ReadmeRenderer from '$lib/components/ReadmeRenderer.svelte';
	import InstallButton from '$lib/components/InstallButton.svelte';

	let { data } = $props();
	const { extension, versions, github, readmeHtml, isMonorepo } = data;
</script>

<svelte:head>
	<title>{extension.name} — ZedExt</title>
	<meta
		name="description"
		content={extension.description ?? `${extension.name} extension for the Zed editor`}
	/>
	<meta property="og:title" content="{extension.name} — ZedExt" />
	<meta
		property="og:description"
		content={extension.description ?? `${extension.name} extension for the Zed editor`}
	/>
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
				<div class="mt-3 flex flex-wrap gap-1.5">
					{#each extension.provides as provide}
						<ProvideTag {provide} />
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
			{#if readmeHtml}
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
			<Sidebar {extension} {versions} {github} {isMonorepo} />
		</div>
	</div>
</div>
