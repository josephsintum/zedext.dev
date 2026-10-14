<script lang="ts">
	import { countOf } from '$lib/utils/format.js';
	import ExtensionBrowser from '$lib/components/ExtensionBrowser.svelte';
	import Seo from '$lib/components/Seo.svelte';

	let { data } = $props();
</script>

<Seo
	title="Languages in Zed — ZedExt"
	description="What Zed supports out of the box for each language, plus the extensions that add language servers, linters, formatters and syntax for more."
	path="/languages"
	ogTitle="Languages in Zed"
/>

<ExtensionBrowser initialResults={data.initialResults} category="languages">
	{#snippet intro()}
		<div class="mx-auto max-w-3xl text-center">
			<h1 class="text-4xl font-bold tracking-tight text-balance text-[var(--color-text)]">
				Languages in Zed
			</h1>
			<p class="mt-3 text-[15px] text-[var(--color-text-secondary)]">
				What’s built in, and the extensions that add more, language by language.
			</p>
			<div class="mt-6 grid grid-cols-2 gap-2 text-left sm:grid-cols-3 lg:grid-cols-5">
				{#each data.hubs as hub (hub.slug)}
					<a
						href="/languages/{hub.slug}"
						class="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 py-2.5 hover:border-[var(--color-border-hover)]"
					>
						<span class="block text-[14px] font-medium text-[var(--color-text)]"
							>{hub.emoji} {hub.name}</span
						>
						<span class="text-[12px] text-[var(--color-text-tertiary)]">
							{hub.builtIn ? 'Built in · ' : ''}{countOf(hub.count, 'extension')}
						</span>
					</a>
				{/each}
			</div>
		</div>
	{/snippet}
</ExtensionBrowser>
