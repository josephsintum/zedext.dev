<script lang="ts">
	let { extensionId }: { extensionId: string } = $props();
</script>

<a
	href="zed://extensions/{extensionId}"
	class="inline-flex items-center gap-2 rounded-lg bg-[var(--color-text)] px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)]"
>
	<svg
		class="h-4 w-4"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
	>
		<path d="M13 3L5 13h6l-1 8 8-10h-6l1-8z" />
	</svg>
	Install in Zed
</a>
