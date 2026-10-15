<script lang="ts">
	import '../app.css';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import NavProgress from '$lib/components/NavProgress.svelte';

	let { children, data } = $props();
</script>

<NavProgress />
<div class="flex min-h-screen flex-col">
	<Header />
	<main id="main" class="flex-1">
		{@render children()}
	</main>
	<Footer updatedAt={data.dataUpdatedAt} />
</div>
