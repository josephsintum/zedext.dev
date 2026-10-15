<script lang="ts">
	import type { HubSummary } from '$lib/language-hub.js';
	import { countOf } from '$lib/utils/format.js';

	let { hub }: { hub: HubSummary } = $props();
</script>

<a
	href="/languages/{hub.slug}"
	class="border-border bg-surface-raised hover:border-border-hover rounded-lg border px-3 py-2.5"
>
	<span class="text-text text-14 block font-medium">{hub.emoji} {hub.name}</span>
	<span class="text-text-tertiary text-12">
		{hub.builtIn ? 'Built in · ' : ''}{countOf(hub.count, 'extension')}
	</span>
</a>
