<script lang="ts">
	import ExtensionCard from '$lib/components/ExtensionCard.svelte';
	import Seo from '$lib/components/Seo.svelte';
	import { faqJsonLd } from '$lib/language-hub.js';

	let { data } = $props();
	const title = $derived(`${data.hub.name} in Zed: extensions, language servers and setup`);
	const description = $derived(
		data.hub.builtIn.length > 0
			? `What's built into Zed for ${data.hub.name}, plus ${data.total} ${data.hub.name} extensions: language servers, linters, formatters and snippets.`
			: `Set up ${data.hub.name} in Zed: the main extension plus ${data.total} ${data.hub.name} extensions for language servers, linting and snippets.`
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
	<nav class="mb-3 text-[12px] text-[var(--color-text-tertiary)]">
		<a href="/discover" class="hover:text-[var(--color-text)]">Discover</a> › {data.hub.name}
	</nav>
	<h1 class="text-3xl font-bold tracking-tight text-[var(--color-text)]">
		{data.hub.emoji}
		{data.hub.name} in Zed
	</h1>
	<p class="mt-2 max-w-2xl text-[15px] text-[var(--color-text-secondary)]">{description}</p>

	{#if data.hub.builtIn.length > 0}
		<section class="mt-6 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-5">
			<h2 class="text-[14px] font-semibold text-[var(--color-text)]">
				✓ Built into Zed, no extension needed
			</h2>
			<ul class="mt-2 list-disc space-y-1 pl-5 text-[13px] text-[var(--color-text-secondary)]">
				{#each data.hub.builtIn as item (item)}
					<li>{item}</li>
				{/each}
			</ul>
			<a
				href={data.docsUrl}
				target="_blank"
				rel="noopener noreferrer"
				class="mt-3 inline-block text-[13px] text-[var(--color-accent)] hover:underline"
			>
				Zed's {data.hub.name} docs ↗
			</a>
		</section>
	{:else if data.primary}
		<section
			class="mt-6 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-5"
		>
			<h2 class="text-[14px] font-semibold text-[var(--color-text)]">Start here</h2>
			<p class="mt-1 text-[13px] text-[var(--color-text-secondary)]">
				{data.hub.name} support comes from the
				<a href="/extensions/{data.primary.id}" class="text-[var(--color-accent)] hover:underline"
					>{data.primary.name}</a
				>
				extension.
				<a
					href={data.docsUrl}
					target="_blank"
					rel="noopener noreferrer"
					class="text-[var(--color-accent)] hover:underline">Zed's {data.hub.name} docs ↗</a
				>
			</p>
		</section>
	{/if}

	{#each data.groups as group (group.key)}
		<section class="mt-8">
			<h2 class="mb-3 text-[15px] font-semibold text-[var(--color-text)]">{group.title}</h2>
			<div class="grid auto-rows-fr grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				{#each group.items as hit (hit.id)}
					<div class="relative">
						<ExtensionCard {hit} />
						{#if data.alsoBuiltIn.includes(hit.id)}
							<span
								class="pointer-events-none absolute -top-1 right-3 rounded border border-emerald-500/30 bg-[var(--color-surface-raised)] px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600"
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
			<h2 class="mb-3 text-[15px] font-semibold text-[var(--color-text)]">Common questions</h2>
			{#each data.faq as item (item.q)}
				<details class="border-b border-[var(--color-border)] py-3">
					<summary class="cursor-pointer text-[14px] text-[var(--color-text)]">{item.q}</summary>
					<p class="mt-2 text-[13px] text-[var(--color-text-secondary)]">{item.a}</p>
				</details>
			{/each}
		</section>
	{/if}

	<section class="mt-10">
		<h2 class="mb-3 text-[15px] font-semibold text-[var(--color-text)]">Other languages</h2>
		<div class="flex flex-wrap gap-2">
			{#each data.others as other (other.slug)}
				<a
					href="/languages/{other.slug}"
					class="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 py-1.5 text-[13px] hover:border-[var(--color-border-hover)]"
				>
					{other.emoji}
					{other.name}
				</a>
			{/each}
		</div>
	</section>
</div>
