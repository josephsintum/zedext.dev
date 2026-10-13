<script lang="ts">
	import Seo from '$lib/components/Seo.svelte';

	let { data } = $props();
</script>

<Seo
	title="Collections — ZedExt"
	description="Hand-picked sets of Zed extensions: language setups, the best MCP servers, top dark themes and more."
	path="/collections"
	ogTitle="Zed extension collections"
/>

<div class="mx-auto max-w-6xl px-6 py-10">
	<h1 class="text-3xl font-bold tracking-tight text-[var(--color-text)]">Collections</h1>
	<p class="mt-2 text-[15px] text-[var(--color-text-secondary)]">Hand-picked sets of extensions.</p>
	<div class="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
		{#each data.collections as c (c.slug)}
			<a
				href="/collections/{c.slug}"
				class="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-5 hover:border-[var(--color-border-hover)]"
			>
				<span class="text-[16px] font-semibold text-[var(--color-text)]">{c.emoji} {c.title}</span>
				<p class="mt-1 text-[13px] text-[var(--color-text-secondary)]">{c.description}</p>
				<span class="mt-2 block text-[12px] text-[var(--color-text-tertiary)]"
					>{c.ids.length} extensions</span
				>
			</a>
		{/each}
	</div>
</div>
