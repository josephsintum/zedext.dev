<script lang="ts">
	import ExtensionBrowser from '$lib/components/ExtensionBrowser.svelte';
	import Seo from '$lib/components/Seo.svelte';
	import { countOf } from '$lib/utils/format.js';

	let { data } = $props();
</script>

<Seo
	title="{data.category.title} — ZedExt"
	description={data.category.description}
	path="/{data.category.slug}"
	ogTitle={data.category.title}
/>

<ExtensionBrowser initialResults={data.initialResults} category={data.category.provides}>
	{#snippet intro()}
		<div class="mx-auto max-w-2xl text-center">
			<h1 class="text-4xl font-bold tracking-tight text-balance text-text">
				{data.category.title}
			</h1>
			<p class="mt-3 text-15 leading-relaxed text-text-secondary">
				{countOf(data.total, 'extension')}. {data.category.description}
			</p>
		</div>
	{/snippet}
</ExtensionBrowser>
