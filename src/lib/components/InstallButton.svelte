<script lang="ts">
	import { copyText } from '$lib/utils/clipboard.js';

	let { extensionId }: { extensionId: string } = $props();

	let copied = $state(false);
	let copiedTimer: ReturnType<typeof setTimeout>;
	$effect(() => () => clearTimeout(copiedTimer));

	// Zed doesn't run on phones or tablets: send the page to your computer instead
	async function share() {
		const url = `${location.origin}/extensions/${extensionId}`;
		if (navigator.share) {
			try {
				await navigator.share({ title: document.title, url });
				return;
			} catch (err) {
				if (err instanceof DOMException && err.name === 'AbortError') return; // dismissed
				// Not allowed here (e.g. an embed): copy the link instead
			}
		}
		if (await copyText(url)) {
			copied = true;
			clearTimeout(copiedTimer);
			copiedTimer = setTimeout(() => (copied = false), 2000);
		}
	}

	const buttonClass =
		'items-center gap-2 rounded-lg bg-[var(--color-text)] px-4 py-2.5 text-[13px] font-semibold text-[var(--color-surface)] transition-colors hover:bg-[var(--color-accent-hover)]';
</script>

<a href="zed://extension/{extensionId}" class="inline-flex pointer-coarse:hidden {buttonClass}">
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
<!-- Touch-first devices are mostly phones and tablets, but touch laptops (e.g. a Surface in
	tablet mode) run Zed too, so they keep a plain install link next to the share button -->
<span class="hidden flex-wrap items-center gap-x-3 gap-y-1 pointer-coarse:inline-flex">
	<button type="button" onclick={share} class="inline-flex min-h-11 {buttonClass}">
		<svg
			aria-hidden="true"
			class="h-4 w-4"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<path d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7M16 6l-4-4-4 4M12 2v13" />
		</svg>
		<span aria-live="polite">{copied ? 'Link copied' : 'Send to your computer'}</span>
	</button>
	<a
		href="zed://extension/{extensionId}"
		class="inline-flex min-h-11 items-center text-[13px] text-[var(--color-text-secondary)] underline decoration-[var(--color-border-hover)] underline-offset-4 hover:text-[var(--color-text)]"
	>
		or Install in Zed
	</a>
</span>
