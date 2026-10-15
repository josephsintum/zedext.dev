<script lang="ts">
	import ExtensionBrowser from '$lib/components/ExtensionBrowser.svelte';
	import Seo from '$lib/components/Seo.svelte';

	let { data } = $props();
</script>

<Seo
	title="All Zed extensions — ZedExt"
	description="Search and browse every extension in the Zed registry, ranked by downloads, with GitHub stats and README previews."
	path="/extensions"
	ogTitle="All Zed extensions"
/>

<ExtensionBrowser initialResults={data.initialResults}>
	{#snippet intro()}
		<div class="mx-auto max-w-2xl text-center">
			<h1 class="text-text text-4xl font-bold tracking-tight text-balance">All extensions</h1>
			<p class="text-text-secondary mt-3 text-[15px] leading-relaxed">
				The full Zed extension registry, with instant search, GitHub stats and README previews.
			</p>
		</div>
	{/snippet}
</ExtensionBrowser>
