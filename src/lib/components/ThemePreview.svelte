<script lang="ts">
	import { onMount } from 'svelte';
	import ZedIcon from './ZedIcon.svelte';
	import { fontStyleOf, roleColor, themeColors, type ThemeVariant } from '$lib/theme-preview.js';
	import {
		DEFAULT_SAMPLE,
		readSampleChoice,
		SAMPLES,
		writeSampleChoice,
		type SampleId
	} from '$lib/theme-samples.js';

	let { variants, size = 'md' }: { variants: ThemeVariant[]; size?: 'md' | 'lg' } = $props();

	// The theme picker shows one big preview; extension pages keep the compact size
	const codeSize = $derived(size === 'lg' ? 'text-[15px]' : 'text-[13px]');
	const chromeSize = $derived(size === 'lg' ? 'text-[12px]' : 'text-[11px]');

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
	const c = $derived(themeColors(current));
	/** The line with the cursor, drawn as Zed's active line */
	const ACTIVE_LINE = 3;
	/** Every tab pads to the longest sample, so switching languages never resizes the window */
	const MAX_LINES = Math.max(...SAMPLES.map((s) => s.lines.length));

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

	<!-- A Zed-like window. All colors are validated hex values, set as CSS variables once per
	     variant; the markup below only refers to the variables. -->
	<div
		class="overflow-hidden rounded-lg border shadow-sm {chromeSize}"
		style:--bg={c.bg}
		style:--fg={c.fg}
		style:--border={c.border}
		style:--title-bar={c.titleBar}
		style:--tab-active={c.tabActive}
		style:--tab-inactive={c.tabInactive}
		style:--status={c.status}
		style:--text={c.text}
		style:--text-muted={c.textMuted}
		style:--icon={c.icon}
		style:--gutter={c.gutter}
		style:--gutter-active={c.gutterActive}
		style:--active-line={c.activeLine}
		style:--cursor={c.cursor}
		style:--error={c.error}
		style:--warning={c.warning}
		style:border-color="var(--border)"
	>
		<div
			class="flex h-8 items-center gap-3 border-b px-3"
			style:background-color="var(--title-bar)"
			style:border-color="var(--border)"
			style:color="var(--text)"
		>
			<span class="flex gap-1.5" aria-hidden="true">
				<i class="size-2.5 rounded-full bg-[#ff5f57]"></i>
				<i class="size-2.5 rounded-full bg-[#febc2e]"></i>
				<i class="size-2.5 rounded-full bg-[#28c840]"></i>
			</span>
			<span class="font-medium">zedext</span>
			<span class="flex items-center gap-1" style:color="var(--text-muted)">
				<ZedIcon name="gitBranch" size={12} /> main
			</span>
		</div>

		<!-- The file tabs double as the language switcher -->
		<div
			class="flex overflow-x-auto [scrollbar-width:none]"
			style:background-color="var(--tab-inactive)"
			role="tablist"
			aria-label="Code sample language"
		>
			<span
				class="flex items-center gap-2.5 border-r border-b px-2.5"
				style:border-color="var(--border)"
				style:color="var(--icon)"
				aria-hidden="true"
			>
				<ZedIcon name="arrowLeft" size={13} /><ZedIcon name="arrowRight" size={13} />
			</span>
			{#each SAMPLES as s (s.id)}
				{@const active = s.id === sample.id}
				<button
					type="button"
					role="tab"
					aria-selected={active}
					onclick={() => choose(s.id)}
					class="shrink-0 border-r border-b px-4 py-1.5"
					style:background-color={active ? 'var(--tab-active)' : 'var(--tab-inactive)'}
					style:color={active ? 'var(--text)' : 'var(--text-muted)'}
					style:border-color="var(--border)"
					style:border-bottom-color={active ? 'transparent' : 'var(--border)'}
				>
					{s.file}
				</button>
			{/each}
			<span class="min-w-4 flex-1 border-b" style:border-color="var(--border)"></span>
		</div>

		<div
			class="font-code flex overflow-x-auto py-3 leading-relaxed {codeSize}"
			style:background-color="var(--bg)"
			style:color="var(--fg)"
		>
			<pre class="m-0 min-w-full font-[inherit]">{#each sample.lines as line, i (i)}{@const active =
						i === ACTIVE_LINE}<div
						class="flex pr-4"
						style:background-color={active ? 'var(--active-line)' : undefined}><span
							class="w-12 shrink-0 pr-4 text-right select-none"
							style:color={active ? 'var(--gutter-active)' : 'var(--gutter)'}
							aria-hidden="true">{i + 1}</span
						><span
							>{#each line as [text, role], j (j)}<span
									class:italic={fontStyleOf(current, role).italic}
									class:font-bold={fontStyleOf(current, role).bold}
									style:color={roleColor(c, role)}>{text}</span
								>{/each}{#if active}<span
									class="ml-px inline-block h-[1.1em] w-0.5 align-[-0.2em]"
									style:background-color="var(--cursor)"
									aria-hidden="true"></span>{/if}</span
						></div>{/each}{#each { length: MAX_LINES - sample.lines.length } as _, k (k)}<div
						aria-hidden="true">&nbsp;</div>{/each}</pre>
		</div>

		<div
			class="flex h-7 items-center justify-between gap-3 border-t px-2"
			style:background-color="var(--status)"
			style:border-color="var(--border)"
			style:color="var(--icon)"
			aria-hidden="true"
		>
			<span class="flex items-center gap-2.5">
				<ZedIcon name="panelLeft" size={13} />
				<ZedIcon name="sparkles" size={13} />
				<span class="h-3.5 w-px" style:background-color="var(--border)"></span>
				<ZedIcon name="search" size={13} />
				<ZedIcon name="zap" size={13} />
				<span class="flex items-center gap-1" style:color="var(--text)">
					<span style:color="var(--error)"><ZedIcon name="octagonAlert" size={13} /></span>1
					<span style:color="var(--warning)"><ZedIcon name="triangleAlert" size={13} /></span>5
				</span>
			</span>
			<span class="flex items-center gap-2.5">
				<span style:color="var(--text)">{sample.language}</span>
				<span class="h-3.5 w-px max-sm:hidden" style:background-color="var(--border)"></span>
				<span class="flex items-center gap-2.5 max-sm:hidden">
					<ZedIcon name="terminal" size={13} />
					<ZedIcon name="bug" size={13} />
					<ZedIcon name="listTree" size={13} />
					<ZedIcon name="users" size={13} />
					<ZedIcon name="gitBranch" size={13} />
				</span>
			</span>
		</div>
	</div>
</section>
