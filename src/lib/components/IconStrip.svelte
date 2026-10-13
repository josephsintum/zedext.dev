<script lang="ts">
	let { id, version }: { id: string; version: string } = $props();
</script>

<img
	src="/icons/{id}?v={encodeURIComponent(version)}"
	alt=""
	aria-hidden="true"
	loading="lazy"
	decoding="async"
	height="16"
	class="mb-2 h-4 w-auto self-start"
/>
