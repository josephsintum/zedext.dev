<script lang="ts">
	import { svgDataUri, type IconVariant } from '$lib/theme-preview.js';

	let { variants }: { variants: IconVariant[] } = $props();
	let selected = $state(0);
	const v = $derived(variants[Math.min(selected, variants.length - 1)]);
</script>

<section class="mb-6" aria-label="Icon theme preview">
	{#if variants.length > 1}
		<div class="mb-3 flex flex-wrap gap-1.5" role="tablist" aria-label="Icon theme variants">
			{#each variants as variant, i (i)}
				<button
					role="tab"
					aria-selected={selected === i}
					onclick={() => (selected = i)}
					class="rounded-full border px-3 py-1 text-[12px] transition-colors {selected === i
						? 'border-[var(--color-accent)] font-semibold text-[var(--color-accent)]'
						: 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-hover)]'}"
				>
					{variant.name}
				</button>
			{/each}
		</div>
	{/if}

	<div
		class="rounded-lg border border-[var(--color-border)] p-4 font-mono text-[13px] {v.appearance ===
		'dark'
			? 'bg-zinc-900 text-zinc-200'
			: 'bg-white text-zinc-800'}"
	>
		<div class="flex items-center gap-2 py-1">
			{#if v.folder}<img src={svgDataUri(v.folder)} alt="" class="h-4 w-4" />{/if}
			<span>src</span>
		</div>
		<ul class="ml-6">
			{#each v.files.filter((f) => f.svg) as file (file.label)}
				<li class="flex items-center gap-2 py-1">
					<img src={svgDataUri(file.svg!)} alt="" class="h-4 w-4" />
					<span>{file.label}</span>
				</li>
			{/each}
		</ul>
	</div>
</section>
