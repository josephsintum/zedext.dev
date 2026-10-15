<script lang="ts">
	import ZedIcon from './ZedIcon.svelte';
	import { svgDataUri, type IconVariant } from '$lib/theme-preview.js';

	let { variants }: { variants: IconVariant[] } = $props();
	let selected = $state(0);
	const v = $derived(variants[Math.min(selected, variants.length - 1)]);

	/** Zed's default One Dark / One Light chrome, so the icons sit where they would in the editor */
	const CHROME = {
		dark: {
			titleBar: '#3b414d',
			panel: '#2f343e',
			editor: '#282c33',
			border: '#464b57',
			text: '#dce0e5',
			muted: '#a9afbc',
			selected: '#454a56',
			guide: '#4b5160',
			code: '#dce0e526'
		},
		light: {
			titleBar: '#dcdcdd',
			panel: '#ebebec',
			editor: '#fafafa',
			border: '#c9c9ca',
			text: '#242529',
			muted: '#58585a',
			selected: '#d3d3d4',
			guide: '#d0d0d1',
			code: '#2425291f'
		}
	};
	const c = $derived(CHROME[v.appearance]);

	type Row = { label: string; depth: number; svg: string | null };
	/** Directories first, then files, as Zed's project panel sorts them */
	const SRC = ['App.tsx', 'app.py', 'index.html', 'index.ts', 'main.go', 'main.rs', 'style.css'];
	const ROOT = ['Cargo.toml', 'package.json', 'README.md'];
	const ACTIVE = 'main.rs';

	const icons = $derived(new Map(v.files.flatMap((f) => (f.svg ? [[f.label, f.svg]] : []))));
	const rows = $derived<Row[]>([
		{ label: 'zedext', depth: 0, svg: v.folder },
		{ label: 'assets', depth: 1, svg: v.folder },
		{ label: 'src', depth: 1, svg: v.folder },
		...SRC.filter((l) => icons.has(l)).map((l) => ({ label: l, depth: 2, svg: icons.get(l)! })),
		{ label: 'tests', depth: 1, svg: v.folder },
		...ROOT.filter((l) => icons.has(l)).map((l) => ({ label: l, depth: 1, svg: icons.get(l)! }))
	]);
	const selectedLabel = $derived(
		icons.has(ACTIVE) ? ACTIVE : rows.find((r) => r.depth === 2)?.label
	);
	/** The open file plus a couple of neighbours, each tab with its icon */
	const tabs = $derived(
		[selectedLabel, 'Cargo.toml', 'README.md', 'package.json'].filter(
			(l, i, all) => l && icons.has(l) && all.indexOf(l) === i
		) as string[]
	);
	/** Placeholder code: line widths in characters, 0 for a blank line */
	const CODE = [
		[0, 22],
		[0, 0],
		[0, 14],
		[4, 26],
		[4, 31],
		[4, 0],
		[4, 18],
		[8, 24],
		[4, 1],
		[0, 1]
	];
</script>

<section class="mb-6" aria-label="Icon theme preview">
	<!-- Pills for a handful of variants; a dropdown for themes that ship dozens (base16 has 251) -->
	{#if variants.length > 8}
		<label class="mb-3 flex items-center gap-2 text-12 text-text-secondary">
			{variants.length} variants
			<select
				bind:value={selected}
				aria-label="Icon theme variant"
				class="rounded-md border border-border bg-surface-raised px-2 py-1 text-12 text-text"
			>
				{#each variants as variant, i (i)}<option value={i}>{variant.name}</option>{/each}
			</select>
		</label>
	{:else if variants.length > 1}
		<div class="mb-3 flex flex-wrap gap-1.5" role="group" aria-label="Icon theme variants">
			{#each variants as variant, i (i)}
				<button
					type="button"
					aria-pressed={selected === i}
					onclick={() => (selected = i)}
					class="rounded-full border px-3 py-1 text-12 transition-colors {selected === i
						? 'border-accent font-semibold text-accent'
						: 'border-border text-text-secondary hover:border-border-hover'}"
				>
					{variant.name}
				</button>
			{/each}
		</div>
	{/if}

	<!-- A Zed window: project panel on the left, an open file on the right -->
	<div
		class="overflow-hidden rounded-lg border text-11 shadow-sm"
		style:border-color={c.border}
		style:color={c.text}
	>
		<div
			class="flex h-8 items-center gap-3 border-b px-3"
			style:background-color={c.titleBar}
			style:border-color={c.border}
		>
			<span class="flex gap-1.5" aria-hidden="true">
				<i class="size-2.5 rounded-full bg-[#ff5f57]"></i>
				<i class="size-2.5 rounded-full bg-[#febc2e]"></i>
				<i class="size-2.5 rounded-full bg-[#28c840]"></i>
			</span>
			<span class="font-medium">zedext</span>
			<span class="flex items-center gap-1" style:color={c.muted}>
				<ZedIcon name="gitBranch" size={12} /> main
			</span>
		</div>

		<div class="flex">
			<ul
				class="w-full shrink-0 border-r py-1.5 text-13 sm:w-60"
				style:background-color={c.panel}
				style:border-color={c.border}
				aria-label="Project files"
			>
				{#each rows as row (row.label)}
					<li
						class="relative flex h-[26px] items-center gap-2 pr-3"
						style:padding-left="{12 + row.depth * 20}px"
						style:background-color={row.label === selectedLabel ? c.selected : undefined}
					>
						<!-- Indent guides: one line per ancestor, under its icon -->
						{#each { length: row.depth } as _, d (d)}
							<span
								class="absolute inset-y-0 w-px"
								style:left="{12 + d * 20 + 7}px"
								style:background-color={c.guide}
								aria-hidden="true"
							></span>
						{/each}
						{#if row.svg}
							<img src={svgDataUri(row.svg)} alt="" class="size-4 shrink-0" />
						{:else}
							<span class="size-4 shrink-0"></span>
						{/if}
						<span class="truncate">{row.label}</span>
					</li>
				{/each}
			</ul>

			<div
				class="min-w-0 flex-1 max-sm:hidden"
				style:background-color={c.editor}
				aria-hidden="true"
			>
				<div
					class="flex overflow-hidden border-b text-12"
					style:background-color={c.panel}
					style:border-color={c.border}
				>
					{#each tabs as tab, i (tab)}
						<span
							class="flex shrink-0 items-center gap-1.5 border-r px-3 py-1.5"
							style:border-color={c.border}
							style:background-color={i === 0 ? c.editor : undefined}
							style:color={i === 0 ? c.text : c.muted}
						>
							<img src={svgDataUri(icons.get(tab)!)} alt="" class="size-3.5" />
							{tab}
						</span>
					{/each}
				</div>
				<div class="py-3 font-mono text-12 leading-[22px]">
					{#each CODE as [indent, width], i (i)}
						<div class="flex items-center">
							<span class="w-10 shrink-0 pr-3 text-right" style:color={c.muted}>{i + 1}</span>
							{#if width}
								<span
									class="h-2 rounded-sm"
									style:margin-left="{indent}ch"
									style:width="{width}ch"
									style:background-color={c.code}
								></span>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		</div>

		<div
			class="flex h-7 items-center gap-2.5 border-t px-2"
			style:background-color={c.titleBar}
			style:border-color={c.border}
			style:color={c.muted}
			aria-hidden="true"
		>
			<span style:color={c.text}><ZedIcon name="panelLeft" size={13} /></span>
			<ZedIcon name="gitBranch" size={13} />
			<ZedIcon name="search" size={13} />
			<ZedIcon name="listTree" size={13} />
		</div>
	</div>
</section>
