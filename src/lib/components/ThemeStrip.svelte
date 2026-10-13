<script lang="ts">
	let { colors }: { colors: string[] } = $props();
</script>

<!-- Colors are validated hex values (theme-preview.ts); style: sets them via setProperty -->
<div
	class="-mx-4 -mt-4 mb-3 flex h-2 shrink-0 border-b border-[var(--color-border-hover)]"
	aria-hidden="true"
>
	{#each colors as color, i (i)}
		<span class={i === 0 ? 'flex-[2.5]' : 'flex-1'} style:background-color={color}></span>
	{/each}
</div>
