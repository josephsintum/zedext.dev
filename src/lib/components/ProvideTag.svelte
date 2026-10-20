<script lang="ts">
	import clsx from 'clsx';
	import { tagFor } from '$lib/kinds.js';

	let { provide, class: className }: { provide: string; class?: string } = $props();

	const t = $derived(tagFor(provide));
</script>

<span
	class={clsx(
		'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-11 font-medium tracking-wide uppercase',
		t.badge,
		className
	)}
>
	<span class={clsx('h-1.5 w-1.5 rounded-full', t.dot)}></span>
	{t.tag}
</span>
