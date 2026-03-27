<script lang="ts">
	import type { ZedExtension } from '$lib/types.js';
	import { formatDate } from '$lib/utils/format.js';
	import { parseRepoUrl } from '$lib/utils/parse-repo-url.js';

	let { versions }: { versions: ZedExtension[] } = $props();

	let showAll = $state(false);
	const displayVersions = $derived(showAll ? versions : versions.slice(0, 10));

	const parsed = $derived(parseRepoUrl(versions[0]?.repository ?? ''));
	const repoBase = $derived(
		parsed ? `https://github.com/${parsed.owner}/${parsed.repo}` : null
	);

	function compareUrl(version: string, prevVersion: string | null): string | null {
		if (!repoBase || !prevVersion) return null;
		// Try v-prefixed tags (most common convention)
		return `${repoBase}/compare/v${prevVersion}...v${version}`;
	}
</script>

<div>
	<h3
		class="mb-3 text-[13px] font-semibold tracking-wide text-[var(--color-text-tertiary)] uppercase"
	>
		Versions
		<span class="ml-1 font-normal">({versions.length})</span>
	</h3>

	<div class="space-y-0">
		{#each displayVersions as v, i}
			{@const prevVersion = i < versions.length - 1 ? versions[i + 1]?.version : null}
			{@const url = compareUrl(v.version, prevVersion)}
			{#if url}
				<a
					href={url}
					target="_blank"
					rel="noopener noreferrer"
					class="flex items-center justify-between border-b border-[var(--color-border)] py-2 transition-colors last:border-0 hover:text-[var(--color-accent)]"
				>
					<span
						class="font-mono text-[13px] {i === 0 ? 'font-semibold text-[var(--color-accent)]' : 'text-[var(--color-text)]'}"
					>
						v{v.version}
						{#if i === 0}
							<span class="ml-1 text-[10px] font-normal text-[var(--color-text-tertiary)]">latest</span>
						{/if}
					</span>
					<span class="text-[12px] text-[var(--color-text-tertiary)]">
						{formatDate(v.published_at)}
					</span>
				</a>
			{:else}
				<div
					class="flex items-center justify-between border-b border-[var(--color-border)] py-2 last:border-0"
				>
					<span
						class="font-mono text-[13px] {i === 0 ? 'font-semibold text-[var(--color-accent)]' : 'text-[var(--color-text)]'}"
					>
						v{v.version}
						{#if i === 0}
							<span class="ml-1 text-[10px] font-normal text-[var(--color-text-tertiary)]">latest</span>
						{/if}
					</span>
					<span class="text-[12px] text-[var(--color-text-tertiary)]">
						{formatDate(v.published_at)}
					</span>
				</div>
			{/if}
		{/each}
	</div>

	{#if versions.length > 10 && !showAll}
		<button
			onclick={() => (showAll = true)}
			class="mt-2 text-[13px] font-medium text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]"
		>
			Show all {versions.length} versions
		</button>
	{/if}
</div>
