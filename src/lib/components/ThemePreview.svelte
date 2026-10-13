<script lang="ts">
	import type { ThemeVariant } from '$lib/theme-preview.js';

	let { variants }: { variants: ThemeVariant[] } = $props();
	let selected = $state(0);
	const c = $derived(variants[Math.min(selected, variants.length - 1)].colors);
</script>

<section class="mb-6" aria-label="Theme preview">
	{#if variants.length > 1}
		<div class="mb-3 flex flex-wrap gap-1.5" role="tablist" aria-label="Theme variants">
			{#each variants as v, i (i)}
				<button
					role="tab"
					aria-selected={selected === i}
					onclick={() => (selected = i)}
					class="flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] transition-colors {selected ===
					i
						? 'border-[var(--color-accent)] font-semibold text-[var(--color-accent)]'
						: 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-hover)]'}"
				>
					<span
						class="h-2.5 w-2.5 rounded-full border border-black/10"
						style:background-color={v.colors.bg}
					></span>
					{v.name}
				</button>
			{/each}
		</div>
	{/if}

	<!-- All colors are validated hex values; style: sets them with setProperty -->
	<div
		class="overflow-hidden rounded-lg border font-mono text-[13px] leading-relaxed shadow-sm"
		style:background-color={c.bg}
		style:color={c.fg}
		style:border-color={c.border}
	>
		<div class="flex text-[11px]" style:background-color={c.status} style:color={c.gutter}>
			<span class="px-4 py-2" style:background-color={c.bg} style:color={c.fg}>config.rs</span>
			<span class="px-4 py-2">main.rs</span>
		</div>
		<div class="flex overflow-x-auto py-3">
			<div class="pr-4 pl-4 text-right select-none" style:color={c.gutter} aria-hidden="true">
				{#each [1, 2, 3, 4, 5, 6, 7] as n (n)}<div>{n}</div>{/each}
			</div>
			<pre class="m-0 pr-4 font-mono"><span style:color={c.comment} class="italic"
					>// Load settings, retrying a few times</span
				>
<span style:color={c.keyword}>fn</span> <span style:color={c.function}>load_config</span><span
					style:color={c.punct}>(</span
				><span style:color={c.variable}>path</span><span style:color={c.punct}>: &amp;</span><span
					style:color={c.type}>str</span
				><span style:color={c.punct}>) -&gt;</span> <span style:color={c.type}>Result</span><span
					style:color={c.punct}>&lt;</span
				><span style:color={c.type}>Config</span><span style:color={c.punct}>, </span><span
					style:color={c.type}>Error</span
				><span style:color={c.punct}>&gt; {'{'}</span>
    <span style:color={c.keyword}>let</span> <span style:color={c.variable}>retries</span> <span
					style:color={c.punct}>=</span
				> <span style:color={c.number}>3</span><span style:color={c.punct}>;</span>
    <span style:color={c.keyword}>let</span> <span style:color={c.variable}>text</span> <span
					style:color={c.punct}>=</span
				> <span style:color={c.type}>fs</span><span style:color={c.punct}>::</span><span
					style:color={c.function}>read_to_string</span
				><span style:color={c.punct}>(</span><span style:color={c.variable}>path</span><span
					style:color={c.punct}>)?;</span
				>
    <span style:color={c.keyword}>let</span> <span style:color={c.variable}>name</span> <span
					style:color={c.punct}>=</span
				> <span style:color={c.string}>"settings.json"</span><span style:color={c.punct}>;</span>
    <span style:color={c.type}>Ok</span><span style:color={c.punct}>(</span><span
					style:color={c.type}>Config</span
				> <span style:color={c.punct}>{'{'}</span> <span style:color={c.variable}>text</span><span
					style:color={c.punct}>,</span
				> <span style:color={c.variable}>retries</span><span style:color={c.punct}>,</span> <span
					style:color={c.variable}>name</span
				> <span style:color={c.punct}>{'})'}</span>
<span style:color={c.punct}>{'}'}</span></pre>
		</div>
		<div
			class="flex justify-between px-4 py-1 text-[11px]"
			style:background-color={c.status}
			style:color={c.gutter}
		>
			<span>Rust · UTF-8</span><span>Ln 4, Col 18</span>
		</div>
	</div>
</section>
