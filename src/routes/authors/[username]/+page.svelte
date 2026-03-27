<script lang="ts">
	import ProvideTag from '$lib/components/ProvideTag.svelte';
	import { formatNumber } from '$lib/utils/format.js';
	import { filterProvides, getHoverBorder } from '$lib/utils/extension-ui.js';

	let { data } = $props();
	const user = $derived(data.user);
	const extensions = $derived(data.extensions);
</script>

<svelte:head>
	<title>{user.name ?? user.login} — ZedExt</title>
	<meta
		name="description"
		content={user.bio ?? `Extensions by ${user.name ?? user.login} on ZedExt`}
	/>
	<link rel="canonical" href={`https://zedext.dev/authors/${user.login}`} />
	<meta property="og:type" content="profile" />
	<meta property="og:site_name" content="ZedExt" />
	<meta property="og:url" content={`https://zedext.dev/authors/${user.login}`} />
	<meta property="og:title" content={`${user.name ?? user.login} — ZedExt`} />
	<meta
		property="og:description"
		content={user.bio ?? `Extensions by ${user.name ?? user.login} on ZedExt`}
	/>
	<meta property="og:image" content={user.avatar_url} />
	<meta property="og:image:width" content="460" />
	<meta property="og:image:height" content="460" />
	<meta name="twitter:card" content="summary" />
</svelte:head>

<div class="mx-auto max-w-7xl px-6 py-8">
	<!-- Breadcrumb -->
	<nav class="mb-6 text-[13px] text-[var(--color-text-tertiary)]">
		<a href="/" class="transition-colors hover:text-[var(--color-text)]">Authors</a>
		<span class="mx-2">/</span>
		<span class="text-[var(--color-text)]">{user.login}</span>
	</nav>

	<!-- Profile header -->
	<div class="mb-8 flex items-start gap-5">
		<img
			src={user.avatar_url}
			alt={user.name ?? user.login}
			class="h-20 w-20 shrink-0 rounded-full border border-[var(--color-border)]"
		/>
		<div class="min-w-0">
			<h1 class="text-xl font-bold text-[var(--color-text)]">
				{user.name ?? user.login}
			</h1>
			<a
				href={user.html_url}
				target="_blank"
				rel="noopener noreferrer"
				class="mt-0.5 inline-flex items-center gap-1 text-[13px] text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-accent)]"
			>
				<svg aria-hidden="true" class="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
					<path
						d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
					/>
				</svg>
				@{user.login}
			</a>
			{#if user.bio}
				<p class="mt-2 text-[14px] leading-relaxed text-[var(--color-text-secondary)]">
					{user.bio}
				</p>
			{/if}
			{#if user.location || user.company}
				<div
					class="mt-1.5 flex flex-wrap items-center gap-3 text-[12px] text-[var(--color-text-tertiary)]"
				>
					{#if user.company}
						<span class="flex items-center gap-1">
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
									d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21"
								/>
							</svg>
							{user.company}
						</span>
					{/if}
					{#if user.location}
						<span class="flex items-center gap-1">
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
									d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
								/>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
								/>
							</svg>
							{user.location}
						</span>
					{/if}
				</div>
			{/if}
		</div>
	</div>

	<!-- Extensions section -->
	<div>
		<h2
			class="mb-4 text-[13px] font-semibold tracking-wide text-[var(--color-text-tertiary)] uppercase"
		>
			Extensions
			<span
				class="ml-1 rounded-md bg-[var(--color-surface-hover)] px-1.5 py-0.5 font-mono text-[11px] font-normal"
			>
				{extensions.length}
			</span>
		</h2>

		{#if extensions.length > 0}
			<div class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				{#each extensions as hit (hit.objectID)}
					{@const provides = filterProvides(hit.provides)}
					<a
						href="/extensions/{hit.objectID}"
						class="group flex flex-col rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4 transition-colors duration-150 {getHoverBorder(
							hit
						)}"
					>
						<div class="mb-1.5 flex items-start justify-between gap-2">
							<h3
								class="min-w-0 truncate font-mono text-[14px] font-semibold text-[var(--color-accent)] group-hover:text-[var(--color-accent-hover)]"
							>
								{hit.name}
							</h3>
							<span
								class="flex shrink-0 items-center gap-1 text-[12px] text-[var(--color-text-tertiary)] tabular-nums"
							>
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
										d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
									/>
								</svg>
								{formatNumber(hit.download_count)}
							</span>
						</div>

						{#if hit.description}
							<p
								class="mb-3 line-clamp-2 text-[13px] leading-relaxed text-[var(--color-text-secondary)]"
							>
								{hit.description}
							</p>
						{:else}
							<div class="mb-3"></div>
						{/if}

						{#if provides.length > 0}
							<div class="mt-auto flex flex-wrap gap-1">
								{#each provides.slice(0, 2) as provide}
									<ProvideTag {provide} />
								{/each}
							</div>
						{/if}
					</a>
				{/each}
			</div>
		{:else}
			<div
				class="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-8 text-center"
			>
				<p class="text-[var(--color-text-tertiary)]">No extensions found for this author.</p>
			</div>
		{/if}
	</div>
</div>
