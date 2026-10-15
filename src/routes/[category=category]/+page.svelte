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
			<h1 class="text-text text-4xl font-bold tracking-tight text-balance">
				{data.category.title}
			</h1>
			<p class="text-text-secondary text-15 mt-3 leading-relaxed">
				{countOf(data.total, 'extension')}. {data.category.description}
			</p>
		</div>
	{/snippet}
</ExtensionBrowser>
