<script lang="ts">
	import type { HubSummary } from '$lib/language-hub.js';
	import { countOf } from '$lib/utils/format.js';

	let { hub }: { hub: HubSummary } = $props();
</script>

<a
	href="/languages/{hub.slug}"
	class="rounded-lg border border-border bg-surface-raised px-3 py-2.5 hover:border-border-hover"
>
	<span class="block text-14 font-medium text-text">{hub.emoji} {hub.name}</span>
	<span class="text-12 text-text-tertiary">
		{hub.builtIn ? 'Built in · ' : ''}{countOf(hub.count, 'extension')}
	</span>
</a>
