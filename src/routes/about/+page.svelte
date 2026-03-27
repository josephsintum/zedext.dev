<svelte:head>
	<title>About — Zed Marketplace</title>
	<meta
		name="description"
		content="ZedExt is an alternative extension marketplace for the Zed editor with rich READMEs, GitHub stats, and powerful search."
	/>
</svelte:head>

<div class="mx-auto max-w-3xl px-6 py-16">
	<!-- Hero -->
	<header class="mb-16">
		<div class="mb-4 flex items-center gap-3">
			<div
				class="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-text)] text-[var(--color-surface)]"
			>
				<svg
					aria-hidden="true"
					class="h-5 w-5"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2.5"
					stroke-linecap="round"
				>
					<path d="M13 3L5 13h6l-1 8 8-10h-6l1-8z" />
				</svg>
			</div>
			<h1 class="font-mono text-2xl font-bold tracking-tight">ZedExt</h1>
		</div>
		<p class="text-lg leading-relaxed text-[var(--color-text-secondary)]">
			A fast, modern extension browser for the
			<a
				href="https://zed.dev"
				class="font-medium text-[var(--color-text)] underline decoration-[var(--color-border)] underline-offset-4 transition-colors hover:decoration-[var(--color-accent)]"
				target="_blank"
				rel="noopener noreferrer">Zed editor</a
			> — with rich READMEs, GitHub stats, and powerful search.
		</p>
	</header>

	<!-- What ZedExt is -->
	<section class="mb-14">
		<h2 class="mb-4 text-sm font-semibold uppercase tracking-widest text-[var(--color-text-tertiary)]">
			What ZedExt is
		</h2>
		<div class="space-y-4 text-[15px] leading-relaxed text-[var(--color-text-secondary)]">
			<p>
				ZedExt is an <strong class="text-[var(--color-text)]">alternative extension marketplace</strong> for the Zed editor.
				Zed's official extension page at
				<a
					href="https://zed.dev/extensions"
					class="text-[var(--color-accent)] hover:underline"
					target="_blank"
					rel="noopener noreferrer">zed.dev/extensions</a
				>
				shows only a name, one-line description, and download count. No README, no GitHub stats, no version history.
			</p>
			<p>
				We believe extension discovery should be better. ZedExt provides:
			</p>
			<ul class="ml-1 list-inside list-disc space-y-2 marker:text-[var(--color-border-hover)]">
				<li><strong class="text-[var(--color-text)]">Rich extension pages</strong> — full README rendered with syntax highlighting and properly resolved images</li>
				<li><strong class="text-[var(--color-text)]">GitHub context</strong> — stars, license, last commit, forks, and open issues so you can assess extension health</li>
				<li><strong class="text-[var(--color-text)]">Better search</strong> — typo-tolerant, faceted search with category filters and multiple sort options</li>
				<li><strong class="text-[var(--color-text)]">Version history</strong> — all published versions with dates</li>
				<li><strong class="text-[var(--color-text)]">SEO-friendly</strong> — every extension has a unique, indexable page with proper meta tags</li>
			</ul>
		</div>
	</section>

	<!-- What ZedExt is NOT -->
	<section class="mb-14">
		<h2 class="mb-4 text-sm font-semibold uppercase tracking-widest text-[var(--color-text-tertiary)]">
			What ZedExt is not
		</h2>
		<div class="space-y-4 text-[15px] leading-relaxed text-[var(--color-text-secondary)]">
			<p>
				<strong class="text-[var(--color-text)]">Not a registry.</strong>
				ZedExt doesn't host or publish extensions. Authors continue to publish via PR to
				<a
					href="https://github.com/zed-industries/extensions"
					class="text-[var(--color-accent)] hover:underline"
					target="_blank"
					rel="noopener noreferrer">zed-industries/extensions</a
				>. We're a read-only browser of the official Zed extension registry.
			</p>
			<p>
				<strong class="text-[var(--color-text)]">Not affiliated with Zed Industries.</strong>
				This is an independent community project. We use publicly available data from the Zed API and GitHub.
			</p>
		</div>
	</section>

	<!-- How it works -->
	<section class="mb-14">
		<h2 class="mb-4 text-sm font-semibold uppercase tracking-widest text-[var(--color-text-tertiary)]">
			How it works
		</h2>
		<div class="space-y-4 text-[15px] leading-relaxed text-[var(--color-text-secondary)]">
			<p>
				ZedExt has <strong class="text-[var(--color-text)]">no database</strong>. All data is fetched on-demand from the
				<a
					href="https://zed.dev"
					class="text-[var(--color-accent)] hover:underline"
					target="_blank"
					rel="noopener noreferrer">Zed API</a
				>
				and
				<a
					href="https://github.com"
					class="text-[var(--color-accent)] hover:underline"
					target="_blank"
					rel="noopener noreferrer">GitHub API</a
				>, then cached in memory. Search is powered by
				<a
					href="https://algolia.com"
					class="text-[var(--color-accent)] hover:underline"
					target="_blank"
					rel="noopener noreferrer">Algolia</a
				>, with the index refreshed every 6 hours.
			</p>
			<p>
				Built with
				<a href="https://svelte.dev" class="text-[var(--color-accent)] hover:underline" target="_blank" rel="noopener noreferrer">SvelteKit</a>,
				<a href="https://tailwindcss.com" class="text-[var(--color-accent)] hover:underline" target="_blank" rel="noopener noreferrer">Tailwind CSS</a>, and deployed on
				<a href="https://vercel.com" class="text-[var(--color-accent)] hover:underline" target="_blank" rel="noopener noreferrer">Vercel</a>.
				Inspired by the architecture of <a href="https://npmx.dev" class="text-[var(--color-accent)] hover:underline" target="_blank" rel="noopener noreferrer">npmx.dev</a>.
			</p>
		</div>
	</section>

	<!-- Tech stack -->
	<section class="mb-14">
		<h2 class="mb-4 text-sm font-semibold uppercase tracking-widest text-[var(--color-text-tertiary)]">
			Stack
		</h2>
		<div
			class="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-border)] sm:grid-cols-3"
		>
			{#each [
				{ name: 'SvelteKit', desc: 'Framework' },
				{ name: 'Tailwind CSS v4', desc: 'Styling' },
				{ name: 'Algolia', desc: 'Search' },
				{ name: 'Shiki', desc: 'Syntax highlighting' },
				{ name: 'Vercel', desc: 'Hosting' },
				{ name: 'GitHub API', desc: 'Extension data' }
			] as item}
				<div class="bg-[var(--color-surface)] px-4 py-3">
					<div class="text-[13px] font-medium text-[var(--color-text)]">{item.name}</div>
					<div class="text-[12px] text-[var(--color-text-tertiary)]">{item.desc}</div>
				</div>
			{/each}
		</div>
	</section>

	<!-- Contributors -->
	<section class="mb-14">
		<h2 class="mb-4 text-sm font-semibold uppercase tracking-widest text-[var(--color-text-tertiary)]">
			Contributors
		</h2>
		<div class="space-y-4 text-[15px] leading-relaxed text-[var(--color-text-secondary)]">
			<p>
				ZedExt is open source and built by the community.
			</p>
			<a
				href="https://github.com/josephsintum/zedext.dev"
				class="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-[13px] font-medium text-[var(--color-text)] transition-colors hover:border-[var(--color-border-hover)] hover:bg-[var(--color-surface-hover)]"
				target="_blank"
				rel="noopener noreferrer"
			>
				<svg aria-hidden="true" class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
					<path
						d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
					/>
				</svg>
				View on GitHub
			</a>
			<p class="text-[13px] text-[var(--color-text-tertiary)]">
				Contributions, issues, and feature requests are welcome.
			</p>
		</div>
	</section>

	<!-- Open source -->
	<section
		class="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-6"
	>
		<div class="flex items-start gap-3">
			<div class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
				<svg aria-hidden="true" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
				</svg>
			</div>
			<div>
				<h3 class="mb-1 text-[14px] font-semibold text-[var(--color-text)]">Open Source</h3>
				<p class="text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
					ZedExt is fully open source under the MIT license. The source code, sync pipeline, and
					infrastructure are all publicly available on GitHub.
				</p>
			</div>
		</div>
	</section>
</div>
