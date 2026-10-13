<script lang="ts">
	import { onMount } from 'svelte';
	import type { ThemeVariant } from '$lib/theme-preview.js';
	import {
		DEFAULT_SAMPLE,
		readSampleChoice,
		SAMPLES,
		writeSampleChoice,
		type SampleId
	} from '$lib/theme-samples.js';

	let { variants }: { variants: ThemeVariant[] } = $props();
	let selected = $state(0);
	const c = $derived(variants[Math.min(selected, variants.length - 1)].colors);

	// The language is remembered across theme pages. The server can't know it, so the page
	// renders the default first and switches after hydration.
	let sampleId = $state<SampleId>(DEFAULT_SAMPLE);
	const sample = $derived(SAMPLES.find((s) => s.id === sampleId) ?? SAMPLES[0]);

	/** localStorage itself can throw (e.g. blocked cookies), not just its methods */
	function storage(): Storage | null {
		try {
			return window.localStorage;
		} catch {
			return null;
		}
	}

	// Browser-only: read the remembered language once the component is in the page
	onMount(() => {
		sampleId = readSampleChoice(storage());
	});

	function choose(id: SampleId) {
		sampleId = id;
		writeSampleChoice(storage(), id);
	}
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
		<!-- The editor's file tabs double as the language switcher -->
		<div
			class="flex overflow-x-auto text-[11px]"
			style:background-color={c.status}
			style:color={c.gutter}
			role="tablist"
			aria-label="Code sample language"
		>
			{#each SAMPLES as s (s.id)}
				<button
					role="tab"
					aria-selected={s.id === sample.id}
					onclick={() => choose(s.id)}
					class="shrink-0 px-4 py-2 transition-opacity {s.id === sample.id
						? ''
						: 'opacity-60 hover:opacity-100'}"
					style:background-color={s.id === sample.id ? c.bg : 'transparent'}
					style:color={c.fg}
				>
					{s.file}
				</button>
			{/each}
		</div>
		<div class="flex overflow-x-auto py-3">
			<div class="pr-4 pl-4 text-right select-none" style:color={c.gutter} aria-hidden="true">
				{#each sample.lines as _, i (i)}<div>{i + 1}</div>{/each}
			</div>
			<pre
				class="m-0 pr-4 font-mono">{#each sample.lines as line, i (i)}<div>{#each line as [text, role], j (j)}<span
								class:italic={role === 'comment'}
								style:color={c[role]}>{text}</span
							>{/each}</div>{/each}</pre>
		</div>
		<div
			class="flex justify-between px-4 py-1 text-[11px]"
			style:background-color={c.status}
			style:color={c.gutter}
		>
			<span>{sample.language} · UTF-8</span><span>Ln 4, Col 18</span>
		</div>
	</div>
</section>
