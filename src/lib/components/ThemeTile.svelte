<script lang="ts">
	import type { ThemeTileData } from '$lib/theme-tile.js';
	import { formatNumber } from '$lib/utils/format.js';

	let { tile }: { tile: ThemeTileData } = $props();
	const c = $derived(tile.variant.colors);
	const label = $derived(
		`${tile.count} ${tile.variant.appearance} variant${tile.count > 1 ? 's' : ''}`
	);
</script>

<a
	href="/extensions/{tile.record.id}"
	class="card-hover bg-surface-raised block overflow-hidden rounded-lg border border-[var(--color-border)]"
>
	<div
		class="h-[104px] overflow-hidden border-b p-3 text-[12px] leading-relaxed whitespace-nowrap"
		style:font-family="var(--font-code)"
		style:background={c.bg}
		style:color={c.fg}
		style:border-color={c.border}
		aria-hidden="true"
	>
		<span style:color={c.keyword}>fn</span> <span style:color={c.function}>main</span><span
			style:color={c.punct}>()</span
		>
		&#123;<br />
		&nbsp;&nbsp;<span style:color={c.keyword}>let</span> <span style:color={c.variable}>name</span>
		=
		<span style:color={c.string}>"zed"</span>;<br />
		&nbsp;&nbsp;<span style:color={c.comment} class="italic">// {label}</span><br />
		&#125;
	</div>
	<div class="flex items-center justify-between gap-2 px-2.5 py-2 text-[12px]">
		<span class="truncate font-medium text-[var(--color-text)]">{tile.record.name}</span>
		<span class="shrink-0 text-[var(--color-text-tertiary)] tabular-nums"
			>↓ {formatNumber(tile.record.download_count)}</span
		>
	</div>
</a>
