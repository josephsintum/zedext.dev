<script lang="ts">
	import { replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import Seo from '$lib/components/Seo.svelte';
	import ThemePaletteCard from '$lib/components/ThemePaletteCard.svelte';
	import ThemePreview from '$lib/components/ThemePreview.svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import { filterThemes, type Appearance, type ThemeEntry } from '$lib/theme-picker.js';
	import type { ThemeVariant } from '$lib/theme-preview.js';
	import { formatNumber } from '$lib/utils/format.js';

	let { data } = $props();

	/** Pinning the ~500px preview only works with room left for the cards (matches the class) */
	const PIN_QUERY = '(min-width: 768px) and (min-height: 760px)';

	let appearance = $derived<Appearance>(data.appearance);
	let selectedId = $derived<string | null>(data.themeId);
	let q = $derived(data.q);
	/** Full lists fetched by "Show all", per appearance */
	let loaded = $state<Record<Appearance, ThemeEntry[] | null>>({ dark: null, light: null });
	/** "Show all" state, per appearance so a slow dark list doesn't block the light button */
	let loading = $state<Record<Appearance, boolean>>({ dark: false, light: false });
	let failed = $state<Record<Appearance, boolean>>({ dark: false, light: false });
	let previewEl = $state<HTMLElement>();

	/** Everything known for this appearance; the filter only narrows the cards below it */
	const source = $derived(loaded[appearance] ?? data.entries[appearance]);
	const list = $derived(filterThemes(source, q));
	// Filtering never changes the preview: it stays on the chosen theme until another click
	const selected = $derived(source.find((e) => e.id === selectedId) ?? list[0]);
	const total = $derived(data.totals[appearance]);

	// Full variants load on intent (hover, focus or click) and are kept for the visit
	const variantsById = new SvelteMap<string, ThemeVariant[]>();
	/** Requests in flight; bookkeeping only, so a plain (non-reactive) Map */
	const inflight = new Map<string, Promise<void>>();
	let failedId = $state<string | null>(null);

	function prefetch(id: string): Promise<void> {
		if (variantsById.has(id) || id === data.themeId) return Promise.resolve();
		const pending = inflight.get(id);
		if (pending) return pending;
		const request = fetch(`/themes/${encodeURIComponent(id)}.json`)
			.then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
			.then((variants: ThemeVariant[]) => void variantsById.set(id, variants))
			.finally(() => inflight.delete(id));
		inflight.set(id, request);
		return request;
	}

	const variantsOf = (id: string | undefined) =>
		!id ? undefined : id === data.themeId ? data.selectedVariants : variantsById.get(id);

	/** The theme the preview last finished loading; it stays up while the next one loads */
	let shownId = $derived<string | null>(data.themeId);

	function show(id: string) {
		failedId = null;
		prefetch(id).then(
			() => {
				if (selected?.id === id) shownId = id;
			},
			() => {
				if (selected?.id === id) failedId = id;
			}
		);
	}

	/** A failed load only matters until a retry (hover, focus, click) succeeds */
	const selectedFailed = $derived(
		!!selected && failedId === selected.id && !variantsOf(selected.id)
	);

	const preview = $derived.by(() => {
		const loadedSelected = variantsOf(selected?.id);
		if (selected && loadedSelected) return { id: selected.id, variants: loadedSelected };
		const fallback = shownId ? variantsOf(shownId) : undefined;
		return shownId && fallback ? { id: shownId, variants: fallback } : null;
	});
	const previewVariants = $derived.by(() => {
		const all = preview?.variants ?? [];
		const matching = all.filter((v) => v.appearance === appearance);
		return matching.length > 0 ? matching : all;
	});

	/** Keep the URL shareable without re-running the page load */
	function syncUrl() {
		const url = new URL(page.url);
		url.searchParams.set('appearance', appearance);
		if (selected) url.searchParams.set('theme', selected.id);
		if (q) url.searchParams.set('q', q);
		else url.searchParams.delete('q');
		replaceState(url, page.state);
	}

	let urlTimer: ReturnType<typeof setTimeout>;
	$effect(() => () => clearTimeout(urlTimer));

	/**
	 * The filter searches every theme, so the first keystroke loads the full list (once: after
	 * a failure, the Try Again button retries). The URL catches up when typing pauses, since
	 * browsers limit how often it can change.
	 */
	function filter(next: string) {
		q = next;
		if (!loaded[appearance] && !loading[appearance] && !failed[appearance]) showAll();
		clearTimeout(urlTimer);
		urlTimer = setTimeout(syncUrl, 300);
	}

	async function chooseAppearance(next: Appearance) {
		if (next === appearance) return;
		const keep = selected?.id;
		appearance = next;
		// While filtering, the new selection has to come from every theme, not the top 48
		if (q && !loaded[next] && !loading[next]) await showAll();
		if (appearance !== next) return; // switched back while the list loaded
		const nextList = loaded[next] ?? data.entries[next];
		const fallback = filterThemes(nextList, q)[0] ?? nextList[0];
		selectedId = nextList.some((e) => e.id === keep) ? (keep ?? null) : (fallback?.id ?? null);
		if (selectedId) show(selectedId);
		syncUrl();
	}

	function choose(id: string) {
		selectedId = id;
		show(id);
		syncUrl();
		// The preview is only pinned on large windows (PIN_QUERY); elsewhere bring it into view
		if (!window.matchMedia(PIN_QUERY).matches) {
			previewEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
	}

	async function showAll() {
		const which = appearance;
		loading[which] = true;
		failed[which] = false;
		try {
			const res = await fetch(`/themes.json?appearance=${which}`);
			if (!res.ok) throw new Error(String(res.status));
			loaded[which] = (await res.json()) as ThemeEntry[];
		} catch {
			failed[which] = true;
		} finally {
			loading[which] = false;
		}
	}
</script>

<Seo
	title="Zed themes: preview dark and light themes — ZedExt"
	description="Preview the most downloaded Zed themes side by side. Switch between dark and light, pick a variant and see real code before you install."
	path="/themes"
	ogTitle="Zed themes"
/>

<div class="mx-auto max-w-6xl px-6 py-10">
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

	{#if total > 0}
		{#if selected}
			<!-- Pinned under the header on large windows so a click anywhere in the grid shows up here -->
			<section
				bind:this={previewEl}
				class="z-10 mt-4 scroll-mt-16 [overflow-y:clip] border-b border-[var(--color-border)] bg-[var(--color-surface)] pt-4 pb-5 [@media(min-width:768px)_and_(min-height:760px)]:sticky [@media(min-width:768px)_and_(min-height:760px)]:top-14"
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
				{#if preview && previewVariants.length > 0}
					<div
						class="transition-opacity {preview.id !== selected.id ? 'opacity-60' : ''}"
						aria-busy={preview.id !== selected.id && !selectedFailed}
					>
						{#key `${appearance}:${preview.id}`}
							<ThemePreview variants={previewVariants} size="lg" halo />
						{/key}
					</div>
				{/if}
				{#if selectedFailed}
					<div class="mt-2 flex flex-wrap items-center gap-3 text-[13px]" role="alert">
						<span class="text-[var(--color-text-secondary)]"
							>Couldn’t load this theme’s colors.</span
						>
						<button
							type="button"
							onclick={() => show(selected.id)}
							class="min-h-11 rounded-md border border-[var(--color-border)] px-3 font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
						>
							Try Again
						</button>
					</div>
				{:else if preview && preview.id !== selected.id}
					<p class="mt-2 text-[13px] text-[var(--color-text-tertiary)]" role="status">
						Loading {selected.name}…
					</p>
				{/if}
			</section>
		{/if}

		<div class="mt-5 mb-3 flex flex-wrap items-center justify-between gap-3">
			<p class="text-[13px] text-[var(--color-text-tertiary)]" aria-live="polite">
				{#if q}
					{list.length} matching {appearance} themes
				{:else}
					{list.length} of {total}
					{appearance} themes, most downloaded first
				{/if}
			</p>
			<input
				type="search"
				value={q}
				oninput={(e) => filter(e.currentTarget.value)}
				placeholder="Filter by name or author"
				aria-label="Filter themes"
				class="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 py-1.5 text-[16px] text-[var(--color-text)] placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-accent)] focus:outline-none sm:w-64 sm:text-[14px]"
			/>
		</div>
		{#if list.length > 0}
			<div class="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
				{#each list as entry (entry.id)}
					<ThemePaletteCard
						{entry}
						selected={entry.id === selected?.id}
						onselect={() => choose(entry.id)}
						onintent={() => prefetch(entry.id).catch(() => {})}
					/>
				{/each}
			</div>
		{:else if q && !loading[appearance]}
			<div class="py-10 text-center text-[14px] text-[var(--color-text-secondary)]">
				No {appearance} themes match “{q}”.
				<button
					type="button"
					onclick={() => filter('')}
					class="ml-1 text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]"
					>Clear filter</button
				>
			</div>
		{/if}
		{#if !q && list.length < total}
			<div class="mt-6 text-center">
				<button
					type="button"
					onclick={showAll}
					disabled={loading[appearance]}
					class="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 py-2 text-[13px] text-[var(--color-text)] hover:border-[var(--color-border-hover)] disabled:opacity-60"
				>
					{loading[appearance] ? 'Loading…' : `Show all ${total} ${appearance} themes`}
				</button>
			</div>
		{/if}
		{#if failed[appearance]}
			<div class="mt-3 flex flex-wrap items-center justify-center gap-3 text-[13px]" role="alert">
				<span class="text-[var(--color-text-secondary)]">
					Couldn’t load {q ? 'every theme, so some matches may be missing' : 'the rest'}.
				</span>
				<button
					type="button"
					onclick={showAll}
					class="min-h-11 rounded-md border border-[var(--color-border)] px-3 font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
				>
					Try Again
				</button>
			</div>
		{/if}
	{:else}
		<p class="mt-8 text-[14px] text-[var(--color-text-tertiary)]">
			Theme previews are temporarily unavailable.
			<a href="/extensions?q=theme" class="text-[var(--color-accent)]"
				>Search themes in All extensions →</a
			>
		</p>
	{/if}
</div>
