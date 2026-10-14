<script lang="ts" module>
	/**
	 * Icons for the theme preview's window chrome, from Lucide (ISC license,
	 * https://lucide.dev/license), the set zed.dev's theme builder uses. Shapes are written
	 * as paths so the component never needs {@html}.
	 */
	const ICONS = {
		arrowLeft: ['m12 19-7-7 7-7', 'M19 12H5'],
		arrowRight: ['M5 12h14', 'm12 5 7 7-7 7'],
		panelLeft: [
			'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z',
			'M9 3v18'
		],
		sparkles: [
			'M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z',
			'M20 3v4',
			'M22 5h-4'
		],
		search: ['M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0', 'm21 21-4.3-4.3'],
		zap: [
			'M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z'
		],
		octagonAlert: [
			'M12 16h.01',
			'M12 8v4',
			'M15.312 2a2 2 0 0 1 1.414.586l4.688 4.688A2 2 0 0 1 22 8.688v6.624a2 2 0 0 1-.586 1.414l-4.688 4.688a2 2 0 0 1-1.414.586H8.688a2 2 0 0 1-1.414-.586l-4.688-4.688A2 2 0 0 1 2 15.312V8.688a2 2 0 0 1 .586-1.414l4.688-4.688A2 2 0 0 1 8.688 2z'
		],
		triangleAlert: [
			'm21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3',
			'M12 9v4',
			'M12 17h.01'
		],
		terminal: ['m4 17 6-6-6-6', 'M12 19h8'],
		bug: [
			'm8 2 1.88 1.88',
			'M14.12 3.88 16 2',
			'M9 7.13v-1a3.003 3.003 0 1 1 6 0v1',
			'M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6',
			'M12 20v-9',
			'M6 13H2',
			'M22 13h-4'
		],
		listTree: [
			'M21 12h-8',
			'M21 6H8',
			'M21 18h-8',
			'M3 6v4c0 1.1.9 2 2 2h3',
			'M3 10v6c0 1.1.9 2 2 2h3'
		],
		users: [
			'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2',
			'M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
			'M22 21v-2a4 4 0 0 0-3-3.87',
			'M16 3.13a4 4 0 0 1 0 7.75'
		],
		gitBranch: [
			'M6 3v12',
			'M21 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
			'M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
			'M18 9a9 9 0 0 1-9 9'
		]
	} as const;

	export type ZedIconName = keyof typeof ICONS;
</script>

<script lang="ts">
	let { name, size = 14 }: { name: ZedIconName; size?: number } = $props();
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="2"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
	class="shrink-0"
	>{#each ICONS[name] as d (d)}<path {d} />{/each}</svg
>
