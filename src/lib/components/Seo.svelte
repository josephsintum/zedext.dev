<script lang="ts">
	import { jsonLdScriptTag } from '$lib/utils/json-ld.js';

	let {
		title,
		description,
		path,
		ogTitle = title,
		jsonLd = null,
		noindex = false
	}: {
		title: string;
		description: string;
		/** Path on zedext.dev, e.g. "/themes" */
		path: string;
		ogTitle?: string;
		jsonLd?: unknown;
		noindex?: boolean;
	} = $props();

	const url = $derived(`https://zedext.dev${path}`);
	const ogImage = $derived(
		`https://zedext.dev/og?title=${encodeURIComponent(ogTitle)}&description=${encodeURIComponent(description)}`
	);
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={url} />
	{#if noindex}
		<meta name="robots" content="noindex" />
	{/if}
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="ZedExt" />
	<meta property="og:url" content={url} />
	<meta property="og:title" content={ogTitle} />
	<meta property="og:description" content={description} />
	<meta property="og:image" content={ogImage} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta name="twitter:card" content="summary_large_image" />
	{#if jsonLd}
		<!-- jsonLdScriptTag escapes "<" in the data, so it can't break out of the tag -->
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html jsonLdScriptTag(jsonLd)}
	{/if}
</svelte:head>
