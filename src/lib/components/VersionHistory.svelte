<script lang="ts">
	import type { ZedExtension } from '$lib/types.js';
	import { formatDate } from '$lib/utils/format.js';

	let { versions }: { versions: ZedExtension[] } = $props();

	let showAll = $state(false);
	const displayVersions = $derived(showAll ? versions : versions.slice(0, 10));
</script>

<div>
	<h3 class="mb-3 text-[13px] font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
		Versions
		<span class="ml-1 font-normal">({versions.length})</span>
	</h3>

	<div class="space-y-0">
		{#each displayVersions as v, i}
			<div class="flex items-center justify-between border-b border-[var(--color-border)] py-2 last:border-0">
				<span class="font-mono text-[13px] text-[var(--color-text)] {i === 0 ? 'font-semibold' : ''}">
					v{v.version}
				</span>
				<span class="text-[12px] text-[var(--color-text-tertiary)]">
					{formatDate(v.published_at)}
				</span>
			</div>
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
