<script lang="ts">
	import { navigating, page } from '$app/state';

	// Wait a moment before showing, so preloaded pages that open instantly don't flash a bar
	const DELAY_MS = 120;

	let visible = $state(false);

	$effect(() => {
		// Searches, sorts and Show more on the same page show their own loading state
		if (!navigating.to || navigating.to.url.pathname === page.url.pathname) {
			visible = false;
			return;
		}
		const timer = setTimeout(() => (visible = true), DELAY_MS);
		return () => clearTimeout(timer);
	});
</script>

{#if visible}
	<div
		class="fixed inset-x-0 top-0 z-[60] h-0.5 overflow-hidden"
		role="progressbar"
		aria-label="Loading page"
	>
		<div class="nav-progress h-full w-full origin-left bg-[var(--color-accent)]"></div>
	</div>
{/if}

<style>
	/* Races to most of the width, then creeps, so long loads still look alive */
	.nav-progress {
		animation: nav-progress 8s cubic-bezier(0.1, 0.8, 0.2, 1) forwards;
	}

	@keyframes nav-progress {
		from {
			transform: scaleX(0.05);
		}
		to {
			transform: scaleX(0.95);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.nav-progress {
			animation: none;
			transform: scaleX(0.6);
		}
	}
</style>
