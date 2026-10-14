<script lang="ts">
	import { replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import Seo from '$lib/components/Seo.svelte';
	import ThemePaletteCard from '$lib/components/ThemePaletteCard.svelte';
	import ThemePreview from '$lib/components/ThemePreview.svelte';
	import type { Appearance, ThemeEntry } from '$lib/theme-picker.js';
	import { formatNumber } from '$lib/utils/format.js';

	let { data } = $props();

	let appearance = $derived<Appearance>(data.appearance);
	let selectedId = $derived<string | null>(data.themeId);
	/** Full lists fetched by "Show all", per appearance */
	let loaded = $state<Record<Appearance, ThemeEntry[] | null>>({ dark: null, light: null });
	let loading = $state(false);
	let failed = $state(false);
	let previewEl = $state<HTMLElement>();

	const list = $derived(loaded[appearance] ?? data.entries[appearance]);
	const selected = $derived(list.find((e) => e.id === selectedId) ?? list[0]);
	const total = $derived(data.totals[appearance]);

	/** Keep the URL shareable without re-running the page load */
	function syncUrl() {
		const url = new URL(page.url);
		url.searchParams.set('appearance', appearance);
		if (selected) url.searchParams.set('theme', selected.id);
		replaceState(url, page.state);
	}

	function chooseAppearance(next: Appearance) {
		if (next === appearance) return;
		const keep = selected?.id;
		appearance = next;
		const nextList = loaded[next] ?? data.entries[next];
		selectedId = nextList.some((e) => e.id === keep) ? (keep ?? null) : (nextList[0]?.id ?? null);
		failed = false;
		syncUrl();
	}

	function choose(id: string) {
		selectedId = id;
		syncUrl();
		// On phones the preview isn't pinned, so bring it into view
		if (window.matchMedia('(max-width: 767px)').matches) {
			previewEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
	}

	async function showAll() {
		const which = appearance;
		loading = true;
		failed = false;
		try {
			const res = await fetch(`/discover/themes.json?appearance=${which}`);
			if (!res.ok) throw new Error(String(res.status));
			loaded[which] = (await res.json()) as ThemeEntry[];
		} catch {
			failed = true;
		} finally {
			loading = false;
		}
	}
</script>

<Seo
	title="Zed themes: preview dark and light themes — ZedExt"
	description="Preview the most downloaded Zed themes side by side. Switch between dark and light, pick a variant and see real code before you install."
	path="/discover/themes"
	ogTitle="Zed themes"
/>

<div class="mx-auto max-w-6xl px-6 py-10">
	<nav class="mb-3 text-[12px] text-[var(--color-text-tertiary)]">
		<a href="/discover" class="hover:text-[var(--color-text)]">Discover</a> › Themes
	</nav>
	<div class="flex flex-wrap items-end justify-between gap-4">
		<div>
			<h1 class="text-3xl font-bold tracking-tight text-[var(--color-text)]">Themes</h1>
			<p class="mt-2 text-[15px] text-[var(--color-text-secondary)]">
				Pick a theme to preview it. The most downloaded Zed themes, dark or light.
			</p>
		</div>
		<div
			class="inline-flex rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-0.5 text-[13px]"
			role="group"
			aria-label="Appearance"
		>
			{#each [['dark', '🌙 Dark'], ['light', '☀️ Light']] as const as [a, label] (a)}
				<button
					type="button"
					aria-pressed={appearance === a}
					onclick={() => chooseAppearance(a)}
					class="rounded-md px-4 py-1.5 transition-colors {appearance === a
						? 'bg-[var(--color-text)] text-[var(--color-surface)]'
						: 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'}"
				>
					{label}
				</button>
			{/each}
		</div>
	</div>

	{#if selected}
		<!-- Pinned under the header on wider screens so a click anywhere in the grid shows up here -->
		<section
			bind:this={previewEl}
			class="z-10 mt-4 scroll-mt-16 border-b border-[var(--color-border)] bg-[var(--color-surface)] pt-4 pb-5 md:sticky md:top-14"
			aria-label="Theme preview"
		>
			<div class="mb-3 flex flex-wrap items-baseline justify-between gap-2">
				<p class="text-[13px] text-[var(--color-text-tertiary)]">
					<span class="text-[16px] font-semibold text-[var(--color-text)]">{selected.name}</span>
					{#if selected.author}by {selected.author} ·{/if}
					↓ {formatNumber(selected.downloads)}
				</p>
				<a href="/extensions/{selected.id}" class="text-[13px] text-[var(--color-accent)]"
					>View extension →</a
				>
			</div>
			{#key `${appearance}:${selected.id}`}
				<ThemePreview variants={selected.variants} />
			{/key}
		</section>

		<p class="mt-5 mb-3 text-[13px] text-[var(--color-text-tertiary)]">
			{list.length} of {total}
			{appearance} themes, most downloaded first
		</p>
		<div class="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
			{#each list as entry (entry.id)}
				<ThemePaletteCard
					{entry}
					selected={entry.id === selected.id}
					onselect={() => choose(entry.id)}
				/>
			{/each}
		</div>
		{#if list.length < total}
			<div class="mt-6 text-center">
				<button
					type="button"
					onclick={showAll}
					disabled={loading}
					class="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 py-2 text-[13px] text-[var(--color-text)] hover:border-[var(--color-border-hover)] disabled:opacity-60"
				>
					{loading ? 'Loading…' : `Show all ${total} ${appearance} themes`}
				</button>
				{#if failed}
					<p class="mt-2 text-[13px] text-[var(--color-text-tertiary)]">
						Couldn’t load the rest. Try again.
					</p>
				{/if}
			</div>
		{/if}
	{:else}
		<p class="mt-8 text-[14px] text-[var(--color-text-tertiary)]">
			Theme previews are temporarily unavailable.
		</p>
	{/if}
</div>
