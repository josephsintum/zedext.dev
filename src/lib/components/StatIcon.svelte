<script lang="ts" module>
	/** Heroicons outline (MIT), for download and star counts */
	const PATHS = {
		downloads:
			'M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3',
		stars:
			'M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z'
	};
</script>

<script lang="ts">
	let { name, class: className = 'h-3.5 w-3.5' }: { name: keyof typeof PATHS; class?: string } =
		$props();
</script>

<svg
	aria-hidden="true"
	class={className}
	fill="none"
	stroke="currentColor"
	viewBox="0 0 24 24"
	stroke-width="1.5"
>
	<path stroke-linecap="round" stroke-linejoin="round" d={PATHS[name]} />
</svg>
