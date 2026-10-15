<script lang="ts">
	let { extensionId }: { extensionId: string } = $props();
</script>

<!-- Zed runs on desktops, so phones and tablets (touch-first) don't get an install link -->
<a
	href="zed://extension/{extensionId}"
	class="bg-text text-surface hover:bg-accent-hover inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-semibold transition-colors pointer-coarse:hidden"
>
	<svg
		aria-hidden="true"
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
