<script lang="ts">
	import { STAT_ICON_PATHS } from './StatIcon.svelte';
</script>

<!-- The paths StatIcon's <use> points at; once per page, takes no space -->
<svg aria-hidden="true" width="0" height="0" class="absolute">
	{#each Object.entries(STAT_ICON_PATHS) as [name, d] (name)}
		<symbol id="stat-{name}" viewBox="0 0 24 24">
			<path
				{d}
				fill="none"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		</symbol>
	{/each}
</svg>
