<script lang="ts">
	import ExtensionBrowser from '$lib/components/ExtensionBrowser.svelte';
	import HubCard from '$lib/components/HubCard.svelte';
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
			<h1 class="text-text text-4xl font-bold tracking-tight text-balance">Languages in Zed</h1>
			<p class="text-text-secondary text-15 mt-3">
				What’s built in, and the extensions that add more, language by language.
			</p>
			<div class="mt-6 grid grid-cols-2 gap-2 text-left sm:grid-cols-3 lg:grid-cols-5">
				{#each data.hubs as hub (hub.slug)}
					<HubCard {hub} />
				{/each}
			</div>
		</div>
	{/snippet}
</ExtensionBrowser>
