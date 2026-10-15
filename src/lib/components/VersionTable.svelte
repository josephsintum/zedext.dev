<script lang="ts">
	import type { ZedExtension } from '$lib/types.js';
	import { formatDate } from '$lib/utils/format.js';

	let { versions }: { versions: ZedExtension[] } = $props();

	const SHOWN = 5;
	let showAll = $state(false);
	const rows = $derived(showAll ? versions : versions.slice(0, SHOWN));
</script>

<table class="w-full text-[13px]">
	<thead>
		<tr class="border-border text-text-tertiary border-b text-left text-[12px]">
			<th class="py-2 font-medium">Version</th>
			<th class="py-2 font-medium">Released</th>
		</tr>
	</thead>
	<tbody>
		{#each rows as v, i (v.version)}
			<tr class="border-border/60 border-b">
				<td class="text-text py-2.5 font-mono tabular-nums">
					{v.version}
					{#if i === 0}<span class="text-text-tertiary ml-1.5 text-[11px]">latest</span>{/if}
				</td>
				<td class="text-text-secondary py-2.5 tabular-nums">
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
		class="hit-y text-accent hover:text-accent-hover mt-3 text-[13px] font-medium"
	>
		Show all {versions.length} versions
	</button>
{/if}
