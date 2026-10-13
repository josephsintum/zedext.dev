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

	// Light/dark first, then a variant of that appearance. Starts on the first variant's
	// appearance (the author's order); the toggle only shows when a theme ships both.
	const appearances = $derived(
		(['dark', 'light'] as const).filter((a) => variants.some((v) => v.appearance === a))
	);
	let mode = $state<'light' | 'dark' | null>(null);
	const activeMode = $derived(mode ?? variants[0].appearance);
	const shown = $derived(variants.filter((v) => v.appearance === activeMode));
	let picked = $state(0);
	const current = $derived(shown[Math.min(picked, shown.length - 1)] ?? variants[0]);
	const c = $derived(current.colors);

	function chooseMode(next: 'light' | 'dark') {
		mode = next;
		picked = 0;
	}

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
	{#if appearances.length > 1 || shown.length > 1}
		<div class="mb-3 flex flex-wrap items-center gap-3">
			{#if appearances.length > 1}
				<div
					class="inline-flex rounded-md border border-[var(--color-border)] p-0.5 text-[12px]"
					role="group"
					aria-label="Appearance"
				>
					{#each appearances as a (a)}
						<button
							aria-pressed={activeMode === a}
							onclick={() => chooseMode(a)}
							class="rounded px-3 py-1 capitalize transition-colors {activeMode === a
								? 'bg-[var(--color-text)] text-[var(--color-surface)]'
								: 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'}"
						>
							{a}
						</button>
					{/each}
				</div>
			{/if}

			<!-- Pills for a handful of variants; a dropdown for themes that ship dozens (base16 has 251) -->
			{#if shown.length > 8}
				<label class="flex items-center gap-2 text-[12px] text-[var(--color-text-secondary)]">
					{shown.length} variants
					<span class="relative inline-flex">
						<select
							bind:value={picked}
							aria-label="Theme variant"
							class="appearance-none rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] py-1 pr-8 pl-2.5 text-[12px] text-[var(--color-text)]"
						>
							{#each shown as variant, i (i)}<option value={i}>{variant.name}</option>{/each}
						</select>
						<svg
							class="pointer-events-none absolute top-1/2 right-2.5 h-3 w-3 -translate-y-1/2 text-[var(--color-text-tertiary)]"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							viewBox="0 0 24 24"
							aria-hidden="true"
							><path stroke-linecap="round" stroke-linejoin="round" d="M6 9l6 6 6-6" /></svg
						>
					</span>
				</label>
			{:else if shown.length > 1}
				<div class="flex flex-wrap gap-1.5" role="group" aria-label="Theme variants">
					{#each shown as v, i (i)}
						<button
							aria-pressed={current === v}
							onclick={() => (picked = i)}
							class="rounded-full border px-3 py-1 text-[12px] transition-colors {current === v
								? 'border-[var(--color-accent)] font-semibold text-[var(--color-accent)]'
								: 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-hover)]'}"
						>
							{v.name}
						</button>
					{/each}
				</div>
			{/if}
		</div>
	{/if}

	<!-- All colors are validated hex values; style: sets them with setProperty -->
	<div
		class="font-code overflow-hidden rounded-lg border text-[13px] leading-relaxed shadow-sm"
		style:background-color={c.bg}
		style:color={c.fg}
		style:border-color={c.border}
	>
		<!-- The editor's file tabs double as the language switcher -->
		<div
			class="flex overflow-x-auto text-[11px]"
			style:background-color={c.status}
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
			<!-- Text color at reduced opacity: a theme's own line-number color is often too faint here -->
			<div
				class="pr-4 pl-4 text-right opacity-45 select-none"
				style:color={c.fg}
				aria-hidden="true"
			>
				{#each sample.lines as _, i (i)}<div>{i + 1}</div>{/each}
			</div>
			<pre
				class="font-code m-0 pr-4">{#each sample.lines as line, i (i)}<div>{#each line as [text, role], j (j)}<span
								class:italic={role === 'comment'}
								style:color={c[role]}>{text}</span
							>{/each}</div>{/each}</pre>
		</div>
		<div
			class="flex justify-between px-4 py-1 text-[11px]"
			style:background-color={c.status}
			style:color={c.fg}
		>
			<span class="opacity-70">{sample.language} · UTF-8</span><span class="opacity-70"
				>Ln 4, Col 18</span
			>
		</div>
	</div>
</section>
