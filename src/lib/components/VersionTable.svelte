<script lang="ts">
	import type { ZedExtension } from '$lib/types.js';
	import { formatDate } from '$lib/utils/format.js';

	let { versions }: { versions: ZedExtension[] } = $props();

	const SHOWN = 5;
	let showAll = $state(false);
	const rows = $derived(showAll ? versions : versions.slice(0, SHOWN));
</script>

<table class="w-full text-13">
	<thead>
		<tr class="border-b border-border text-left text-12 text-text-tertiary">
			<th class="py-2 font-medium">Version</th>
			<th class="py-2 font-medium">Released</th>
		</tr>
	</thead>
	<tbody>
		{#each rows as v, i (v.version)}
			<tr class="border-b border-border/60">
				<td class="py-2.5 font-mono text-text tabular-nums">
					{v.version}
					{#if i === 0}<span class="ml-1.5 text-11 text-text-tertiary">latest</span>{/if}
				</td>
				<td class="py-2.5 text-text-secondary tabular-nums">
					{formatDate(v.published_at)}
				</td>
			</tr>
		{/each}
	</tbody>
</table>
{#if versions.length > SHOWN && !showAll}
	<button
		type="button"
		onclick={() => (showAll = true)}
		class="hit-y mt-3 text-13 font-medium text-accent hover:text-accent-hover"
	>
		Show all {versions.length} versions
	</button>
{/if}
