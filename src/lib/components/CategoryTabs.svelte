<script lang="ts">
	import clsx from 'clsx';
	import { navigating } from '$app/state';
	import { CATEGORIES } from '$lib/utils/constants.js';
	import { categoryForPath, categoryHref } from '$lib/categories.js';
	import { currentSearchParams } from '$lib/search/client.svelte.js';

	let { active = 'all' }: { active?: string } = $props();

	// Switching category keeps the current search and sort. Not for Themes: the picker filters
	// by name only, so a search like "python" would find nothing there
	const keep = $derived.by(() => {
		const params = currentSearchParams();
		const kept = new URLSearchParams();
		for (const key of ['q', 'sort']) {
			const value = params.get(key);
			if (value) kept.set(key, value);
		}
		const search = kept.toString();
		return search ? `?${search}` : '';
	});

	// Highlight the clicked tab right away, before its page has loaded
	const shown = $derived((navigating.to && categoryForPath(navigating.to.url.pathname)) || active);

	let list: HTMLElement;
	let moreRight = $state(false);

	function updateFade() {
		moreRight = list.scrollLeft + list.clientWidth < list.scrollWidth - 1;
	}

	// Tabs change width when the web font swaps in, not only on window resize
	$effect(() => {
		const observer = new ResizeObserver(updateFade);
		observer.observe(list);
		for (const tab of list.children) observer.observe(tab);
		return () => observer.disconnect();
	});

	// On narrow screens the active tab can sit past the edge; bring it into view
	$effect(() => {
		const tab = list.querySelector(`[data-slug="${active}"]`);
		if (tab) {
			const t = tab.getBoundingClientRect();
			const l = list.getBoundingClientRect();
			if (t.left < l.left || t.right > l.right) list.scrollLeft += t.left - l.left - 16;
		}
		updateFade();
	});
</script>

<nav
	bind:this={list}
	onscroll={updateFade}
	aria-label="Categories"
	class={clsx(
		'hide-scrollbar flex min-w-0 gap-1.5 overflow-x-auto',
		// Hints that more tabs are off to the right
		moreRight && '[mask-image:linear-gradient(to_right,black_calc(100%-2.5rem),transparent)]'
	)}
>
	{#each CATEGORIES as cat (cat.slug)}
		<a
			href={categoryHref(cat.provides ?? 'all') + (cat.provides === 'themes' ? '' : keep)}
			data-slug={cat.slug}
			aria-current={active === cat.slug ? 'page' : undefined}
			class={clsx(
				'group relative shrink-0 rounded-lg px-3 py-2.5 text-13 font-medium transition-colors duration-150',
				shown === cat.slug
					? 'bg-text text-surface shadow-sm'
					: 'text-text-secondary hover:bg-surface-hover hover:text-text'
			)}
		>
			{cat.label}
		</a>
	{/each}
</nav>
