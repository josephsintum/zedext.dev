<script lang="ts">
	import ExtensionCard from './ExtensionCard.svelte';
	import type { ExtensionRecord } from '$lib/types.js';

	let { hits, label }: { hits: ExtensionRecord[]; label: string } = $props();

	let row: HTMLDivElement;
	let atStart = $state(true);
	let atEnd = $state(false);

	function update() {
		atStart = row.scrollLeft <= 1;
		atEnd = row.scrollLeft + row.clientWidth >= row.scrollWidth - 1;
	}

	function page(dir: 1 | -1) {
		const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches;
		row.scrollBy({ left: dir * row.clientWidth * 0.9, behavior: smooth ? 'smooth' : 'auto' });
	}

	$effect(update);

	// Tabbing to a card that's only partly in the row (under the fade) brings it fully into view.
	// Keyboard focus only: Chrome focuses a link on mousedown, and scrolling the snapping row then
	// would slide another card under the pointer before the click lands
	function revealFocused(event: FocusEvent) {
		if (!(event.target as Element).matches(':focus-visible')) return;
		const card = [...row.children].find((c) => c.contains(event.target as Node));
		const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches;
		card?.scrollIntoView({
			inline: 'nearest',
			block: 'nearest',
			behavior: smooth ? 'smooth' : 'auto'
		});
	}

	// Fade whichever edge has more cards past it, so the arrow sits over a faded card, not text
	const fade = $derived(
		`linear-gradient(to right, ${atStart ? '#000' : 'transparent'}, #000 48px, #000 calc(100% - 72px), ${atEnd ? '#000' : 'transparent'})`
	);
</script>

<svelte:window onresize={update} />

{#snippet arrow(dir: 1 | -1, hidden: boolean)}
	<button
		type="button"
		aria-label={dir === 1 ? `Next ${label}` : `Previous ${label}`}
		onclick={() => page(dir)}
		class="absolute top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-surface-raised text-text-secondary shadow-md hover:border-border-hover hover:text-text {dir ===
		1
			? '-right-5'
			: '-left-5'} {hidden ? '' : 'sm:flex'}"
	>
		<svg
			aria-hidden="true"
			class="h-4 w-4"
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
			stroke-width="2"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				d={dir === 1 ? 'M8.25 4.5l7.5 7.5-7.5 7.5' : 'M15.75 19.5L8.25 12l7.5-7.5'}
			/>
		</svg>
	</button>
{/snippet}

<!-- One scrollable row on every screen; the next card peeks in. The negative margins let it
	 run into the page gutter, and the vertical padding keeps hover lifts and focus rings visible.
	 The scrollbar is hidden: phones swipe, and wider screens get the arrow buttons -->
<div class="relative">
	<div
		bind:this={row}
		onscroll={update}
		onfocusin={revealFocused}
		style:mask-image={fade}
		style:-webkit-mask-image={fade}
		class="-mx-6 -my-2 flex snap-x snap-mandatory scroll-px-6 gap-3 overflow-x-auto px-6 py-2 [scrollbar-width:none]"
	>
		{#each hits as hit (hit.id)}
			<div class="w-[80%] shrink-0 snap-start sm:w-[45%] lg:w-[23%]">
				<ExtensionCard {hit} badge="downloads" />
			</div>
		{/each}
	</div>
	{@render arrow(-1, atStart)}
	{@render arrow(1, atEnd)}
</div>
