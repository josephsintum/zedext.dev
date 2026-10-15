<script lang="ts">
	import { countOf } from '$lib/utils/format.js';
	import ExtensionCard from '$lib/components/ExtensionCard.svelte';
	import Seo from '$lib/components/Seo.svelte';
	import { faqJsonLd } from '$lib/language-hub.js';

	let { data } = $props();
	const title = $derived(`${data.hub.name} in Zed: extensions, language servers and setup`);
	const description = $derived(
		data.hub.builtIn.length === 0
			? `Set up ${data.hub.name} in Zed: the main extension plus ${countOf(data.total, `${data.hub.name} extension`)} for language servers, linting and snippets.`
			: data.total > 0
				? `What’s built into Zed for ${data.hub.name}, plus ${countOf(data.total, `${data.hub.name} extension`)}: language servers, linters, formatters and snippets.`
				: `What’s built into Zed for ${data.hub.name}, and how to set it up.`
	);
</script>

<Seo
	title="{title} — ZedExt"
	{description}
	path="/languages/{data.hub.slug}"
	ogTitle="{data.hub.name} in Zed"
	jsonLd={data.faq.length > 0 ? faqJsonLd(data.faq) : null}
/>

<div class="mx-auto max-w-6xl px-6 py-10">
	<nav aria-label="Breadcrumb" class="text-text-tertiary text-12 mb-3">
		<a href="/languages" class="hover:text-text">Languages</a>
		<span aria-hidden="true">›</span>
		<span aria-current="page">{data.hub.name}</span>
	</nav>
	<h1 class="text-text text-3xl font-bold tracking-tight">
		<span aria-hidden="true">{data.hub.emoji}</span>
		{data.hub.name} in Zed
	</h1>
	<p class="text-text-secondary text-15 mt-2 max-w-2xl">{description}</p>

	{#if data.hub.builtIn.length > 0}
		<section class="mt-6 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-5">
			<h2 class="text-text text-14 font-semibold">✓ Built into Zed, no extension needed</h2>
			<ul class="text-text-secondary text-13 mt-2 list-disc space-y-1 pl-5">
				{#each data.hub.builtIn as item (item)}
					<li>{item}</li>
				{/each}
			</ul>
			<a
				href={data.docsUrl}
				target="_blank"
				rel="noopener noreferrer"
				class="text-accent text-13 mt-3 inline-block hover:underline"
			>
				Zed’s {data.hub.name} docs ↗
			</a>
		</section>
	{:else if data.primary}
		<section class="border-border bg-surface-raised mt-6 rounded-lg border p-5">
			<h2 class="text-text text-14 font-semibold">Start here</h2>
			<p class="text-text-secondary text-13 mt-1">
				{data.hub.name} support comes from the
				<a href="/extensions/{data.primary.id}" class="text-accent hover:underline"
					>{data.primary.name}</a
				>
				extension.
				<a
					href={data.docsUrl}
					target="_blank"
					rel="noopener noreferrer"
					class="text-accent hover:underline">Zed’s {data.hub.name} docs ↗</a
				>
			</p>
		</section>
	{/if}

	{#each data.groups as group (group.key)}
		<section class="mt-8">
			<h2 class="text-text text-15 mb-3 font-semibold">{group.title}</h2>
			<div class="grid auto-rows-fr grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				{#each group.items as hit (hit.id)}
					<div class="relative">
						<ExtensionCard {hit} />
						{#if data.alsoBuiltIn.includes(hit.id)}
							<span
								class="bg-surface-raised pointer-events-none absolute -top-1 right-3 rounded border border-emerald-500/30 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400"
							>
								Also built in
							</span>
						{/if}
					</div>
				{/each}
			</div>
		</section>
	{/each}

	{#if data.faq.length > 0}
		<section class="mt-10 max-w-3xl">
			<h2 class="text-text text-15 mb-3 font-semibold">Common questions</h2>
			{#each data.faq as item (item.q)}
				<details class="border-border border-b py-3">
					<summary class="text-text text-14 cursor-pointer">{item.q}</summary>
					<p class="text-text-secondary text-13 mt-2">{item.a}</p>
				</details>
			{/each}
		</section>
	{/if}

	<section class="mt-10">
		<h2 class="text-text text-15 mb-3 font-semibold">Other languages</h2>
		<div class="flex flex-wrap gap-2">
			{#each data.others as other (other.slug)}
				<a
					href="/languages/{other.slug}"
					class="border-border bg-surface-raised hover:border-border-hover text-13 rounded-full border px-3 py-1.5"
				>
					{other.emoji}
					{other.name}
				</a>
			{/each}
		</div>
	</section>
</div>
