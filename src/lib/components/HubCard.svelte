<script lang="ts">
	import type { HubSummary } from '$lib/language-hub.js';
	import { countOf } from '$lib/utils/format.js';

	let { hub }: { hub: HubSummary } = $props();
</script>

<a
	href="/languages/{hub.slug}"
	class="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 py-2.5 hover:border-[var(--color-border-hover)]"
>
	<span class="block text-[14px] font-medium text-[var(--color-text)]">{hub.emoji} {hub.name}</span>
	<span class="text-[12px] text-[var(--color-text-tertiary)]">
		{hub.builtIn ? 'Built in · ' : ''}{countOf(hub.count, 'extension')}
	</span>
</a>
