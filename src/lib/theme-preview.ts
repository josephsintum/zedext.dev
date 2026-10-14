/**
 * Theme and icon-theme previews, parsed from the JSON files in an extension's published
 * archive. Everything here is untrusted third-party data: colors must be plain hex, and
 * SVGs are only ever shown through <img> data URIs (see svgDataUri), never inlined.
 */

/** Fully resolved colors for drawing a preview: see themeColors() */
export interface ThemeColors {
	bg: string;
	fg: string;
	gutter: string;
	status: string;
	border: string;
	/** Window chrome around the editor */
	titleBar: string;
	tabActive: string;
	tabInactive: string;
	text: string;
	textMuted: string;
	icon: string;
	gutterActive: string;
	/** May be translucent; drawn over the editor background */
	activeLine: string;
	error: string;
	warning: string;
	cursor: string;
	keyword: string;
	string: string;
	function: string;
	type: string;
	comment: string;
	number: string;
	punct: string;
	variable: string;
	/** Markdown, HTML and JSON colors: only stored when the theme defines them (see roleColor) */
	title?: string;
	emphasis?: string;
	strong?: string;
	linkText?: string;
	linkUri?: string;
	literal?: string;
	tag?: string;
	attribute?: string;
	property?: string;
}

/** Colors for markup and data files; optional because many themes leave them out */
const EXTRA_ROLES = [
	'title',
	'emphasis',
	'strong',
	'linkText',
	'linkUri',
	'literal',
	'tag',
	'attribute',
	'property'
] as const;
type ExtraRole = (typeof EXTRA_ROLES)[number];

/** The syntax roles the preview draws, keyed as in ThemeColors */
export type StyledRole =
	| 'comment'
	| 'keyword'
	| 'function'
	| 'type'
	| 'variable'
	| 'string'
	| 'number'
	| 'punct'
	| ExtraRole;

/**
 * Only the colors a theme actually defines, under short names (see RAW_KEYS). Fallbacks are
 * applied when drawing, so changing them never needs a re-download.
 */
export type RawColors = Partial<Record<RawKey, string>>;

export interface ThemeVariant {
	name: string;
	appearance: 'light' | 'dark';
	raw?: RawColors;
	/** Bundle format 3 stored resolved colors here; still read until every theme is re-parsed */
	colors?: Partial<ThemeColors>;
	/** Roles the theme draws in italic / bold; omitted when none (most themes) */
	italic?: StyledRole[];
	bold?: StyledRole[];
}

export interface IconFile {
	label: string;
	svg: string | null;
}

export interface IconVariant {
	name: string;
	appearance: 'light' | 'dark';
	folder: string | null;
	files: IconFile[];
}

export interface PreviewBundle {
	/** Bumped when parsing changes, so the sync re-parses entries from older bundles */
	format?: number;
	generatedAt: string;
	themes: Record<string, { version: string; variants: ThemeVariant[] }>;
	icons: Record<string, { version: string; variants: IconVariant[] }>;
}

/** The files shown in an icon-theme preview, in order. */
export const FILE_SAMPLES: { label: string; suffix: string }[] = [
	{ label: 'main.rs', suffix: 'rs' },
	{ label: 'app.py', suffix: 'py' },
	{ label: 'index.ts', suffix: 'ts' },
	{ label: 'App.tsx', suffix: 'tsx' },
	{ label: 'package.json', suffix: 'json' },
	{ label: 'README.md', suffix: 'md' },
	{ label: 'Cargo.toml', suffix: 'toml' },
	{ label: 'main.go', suffix: 'go' },
	{ label: 'style.css', suffix: 'css' },
	{ label: 'index.html', suffix: 'html' }
];

const HEX = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const MAX_SVG_BYTES = 20_000;

/**
 * Blur themes use see-through backgrounds (e.g. #00000000) that would show the site's own
 * page behind the preview; flatten them over black (dark) or white (light).
 */
function opaque(color: string, appearance: 'light' | 'dark'): string {
	const digits = color.slice(1);
	const full = digits.length <= 4 ? [...digits].map((d) => d + d).join('') : digits;
	if (full.length !== 8) return color;
	const alpha = parseInt(full.slice(6, 8), 16) / 255;
	if (alpha >= 0.9) return color;
	const base = appearance === 'light' ? 255 : 0;
	const channel = (i: number) =>
		Math.round(parseInt(full.slice(i, i + 2), 16) * alpha + base * (1 - alpha))
			.toString(16)
			.padStart(2, '0');
	return `#${channel(0)}${channel(2)}${channel(4)}`;
}

/** Theme JSON syntax key for each role */
const SYNTAX_KEYS: Record<StyledRole, string> = {
	comment: 'comment',
	keyword: 'keyword',
	function: 'function',
	type: 'type',
	variable: 'variable',
	string: 'string',
	number: 'number',
	punct: 'punctuation',
	title: 'title',
	emphasis: 'emphasis',
	strong: 'emphasis.strong',
	linkText: 'link_text',
	linkUri: 'link_uri',
	literal: 'text.literal',
	tag: 'tag',
	attribute: 'attribute',
	property: 'property'
};

/** Zed theme JSON keys we keep, by short name. Syntax keys are read from `style.syntax`. */
const RAW_KEYS = {
	bg: 'editor.background',
	fg: 'editor.foreground',
	appBg: 'background',
	surface: 'surface.background',
	titleBar: 'title_bar.background',
	tabActive: 'tab.active_background',
	tabInactive: 'tab.inactive_background',
	status: 'status_bar.background',
	border: 'border',
	text: 'text',
	textMuted: 'text.muted',
	icon: 'icon',
	gutter: 'editor.line_number',
	gutterActive: 'editor.active_line_number',
	activeLine: 'editor.active_line.background',
	error: 'error',
	warning: 'warning'
} as const;
type RawKey = keyof typeof RAW_KEYS | StyledRole | 'cursor';

/** Backgrounds that the site's page would show through; flattened when parsed */
const SOLID_KEYS = new Set([
	'bg',
	'appBg',
	'surface',
	'titleBar',
	'tabActive',
	'tabInactive',
	'status'
]);

/** Used only when a theme defines neither the color nor any of its parents */
const DEFAULT_STATUS = {
	dark: { error: '#f87171', warning: '#facc15' },
	light: { error: '#dc2626', warning: '#ca8a04' }
};

/**
 * Every color a preview needs. Missing ones borrow from a parent, as the Zed theme builder
 * links them (tabs to the editor background, chrome text to the editor text, and so on).
 */
export function themeColors(v: ThemeVariant): ThemeColors {
	const r: RawColors = v.raw ?? (v.colors as RawColors | undefined) ?? {};
	const fg = r.fg ?? r.text ?? '#888888';
	const bg = r.bg ?? r.appBg ?? (v.appearance === 'light' ? '#ffffff' : '#000000');
	const comment = r.comment ?? fg;
	const status = r.status ?? r.titleBar ?? r.appBg ?? bg;
	const text = r.text ?? fg;
	return {
		bg,
		fg,
		gutter: r.gutter ?? comment,
		status,
		border: r.border ?? comment,
		titleBar: r.titleBar ?? r.status ?? r.appBg ?? bg,
		tabActive: r.tabActive ?? bg,
		tabInactive: r.tabInactive ?? r.surface ?? r.appBg ?? bg,
		text,
		textMuted: r.textMuted ?? text,
		icon: r.icon ?? text,
		gutterActive: r.gutterActive ?? fg,
		activeLine: r.activeLine ?? 'transparent',
		error: r.error ?? DEFAULT_STATUS[v.appearance].error,
		warning: r.warning ?? DEFAULT_STATUS[v.appearance].warning,
		cursor: r.cursor ?? fg,
		keyword: r.keyword ?? fg,
		string: r.string ?? fg,
		function: r.function ?? fg,
		type: r.type ?? fg,
		comment,
		number: r.number ?? fg,
		punct: r.punct ?? fg,
		variable: r.variable ?? fg,
		...Object.fromEntries(EXTRA_ROLES.flatMap((k) => (r[k] ? [[k, r[k]]] : [])))
	};
}

/** The first variant's colors of a theme in the bundle, or null (prototype-safe id lookup). */
export function firstVariantColors(previews: PreviewBundle | null, id: string): ThemeColors | null {
	if (!previews || !Object.hasOwn(previews.themes, id)) return null;
	const first = previews.themes[id].variants[0];
	return first ? themeColors(first) : null;
}

/**
 * The color a preview token uses. Like Zed, a missing "emphasis.strong" falls back to
 * "emphasis", and any other missing role draws as plain text.
 */
export function roleColor(c: ThemeColors, role: StyledRole | 'fg'): string {
	if (role === 'fg') return c.fg;
	if (role === 'strong') return c.strong ?? c.emphasis ?? c.fg;
	return c[role] ?? c.fg;
}

/** Weights appear as numbers (700) and as words or strings ("bold", "800") in real themes */
function isBold(weight: unknown): boolean {
	if (typeof weight === 'number') return weight >= 600;
	if (typeof weight !== 'string') return false;
	const w = weight.trim().toLowerCase();
	return Number(w) >= 600 || ['bold', 'bolder', 'semibold', 'extrabold', 'black'].includes(w);
}

function hex(value: unknown): string | null {
	return typeof value === 'string' && HEX.test(value.trim()) ? value.trim() : null;
}

/** Strict JSON first; then the same text with comments and trailing commas removed. */
export function parseJsonLenient(text: string): unknown {
	try {
		return JSON.parse(text);
	} catch {
		// fall through to JSONC
	}
	let out = '';
	let inString = false;
	for (let i = 0; i < text.length; i++) {
		const ch = text[i];
		if (inString) {
			out += ch;
			if (ch === '\\') out += text[++i] ?? '';
			else if (ch === '"') inString = false;
		} else if (ch === '"') {
			inString = true;
			out += ch;
		} else if (ch === '/' && text[i + 1] === '/') {
			while (i < text.length && text[i] !== '\n') i++;
		} else if (ch === '/' && text[i + 1] === '*') {
			const end = text.indexOf('*/', i + 2);
			i = end === -1 ? text.length : end + 1;
		} else {
			out += ch;
		}
	}
	try {
		return JSON.parse(out.replace(/,(\s*[}\]])/g, '$1'));
	} catch {
		return null;
	}
}

type RawVariant = {
	name?: unknown;
	appearance?: unknown;
	style?: Record<string, unknown> & {
		syntax?: Record<
			string,
			{ color?: unknown; font_style?: unknown; font_weight?: unknown } | undefined
		>;
	};
	directory_icons?: { collapsed?: unknown };
	file_suffixes?: Record<string, unknown>;
	file_icons?: Record<string, { path?: unknown } | undefined>;
};

function variantsOf(text: string): RawVariant[] {
	const doc = parseJsonLenient(text) as { themes?: unknown } | null;
	return Array.isArray(doc?.themes) ? (doc.themes as RawVariant[]) : [];
}

const nameOf = (v: RawVariant) => (typeof v.name === 'string' ? v.name : 'Default');
const appearanceOf = (v: RawVariant): 'light' | 'dark' =>
	v.appearance === 'light' ? 'light' : 'dark';

type RawStyle = Record<string, unknown> & {
	syntax?: Record<
		string,
		{ color?: unknown; font_style?: unknown; font_weight?: unknown } | undefined
	>;
	players?: unknown;
};

/** "#AABBCCFF" and "#aabbcc" are the same color; store the short form */
function normalize(color: string): string {
	const c = color.toLowerCase();
	return c.length === 9 && c.endsWith('ff') ? c.slice(0, 7) : c;
}

/**
 * Drop every color the preview would resolve the same without (a tab that matches the editor
 * background, chrome text that matches the editor text...). Roughly halves the stored size.
 */
function compact(raw: RawColors, appearance: 'light' | 'dark'): void {
	const resolve = (r: RawColors) => JSON.stringify(themeColors({ name: '', appearance, raw: r }));
	const target = resolve(raw);
	for (const key of Object.keys(raw) as RawKey[]) {
		if (key === 'bg' || key === 'fg') continue; // the anchors everything else falls back to
		const color = raw[key];
		delete raw[key];
		if (resolve(raw) !== target) raw[key] = color;
	}
}

export function parseThemeFile(text: string): ThemeVariant[] {
	const out: ThemeVariant[] = [];
	for (const v of variantsOf(text)) {
		const style = (v.style ?? {}) as RawStyle;
		const syntax = style.syntax ?? {};
		const appearance = appearanceOf(v);
		const raw: RawColors = {};
		for (const [key, themeKey] of Object.entries(RAW_KEYS) as [keyof typeof RAW_KEYS, string][]) {
			const color = hex(style[themeKey]);
			if (color) raw[key] = normalize(SOLID_KEYS.has(key) ? opaque(color, appearance) : color);
		}
		for (const role of Object.keys(SYNTAX_KEYS) as StyledRole[]) {
			const color = hex(syntax[SYNTAX_KEYS[role]]?.color);
			if (color) raw[role] = normalize(color);
		}
		const players = Array.isArray(style.players) ? style.players : [];
		const cursor = hex((players[0] as { cursor?: unknown } | undefined)?.cursor);
		if (cursor) raw.cursor = normalize(cursor);
		if (!(raw.bg ?? raw.appBg) || !(raw.fg ?? raw.text)) continue; // nothing sensible to draw
		compact(raw, appearance);

		const roles = Object.keys(SYNTAX_KEYS) as StyledRole[];
		const italic = roles.filter((r) => syntax[SYNTAX_KEYS[r]]?.font_style === 'italic');
		const bold = roles.filter((r) => isBold(syntax[SYNTAX_KEYS[r]]?.font_weight));
		out.push({
			name: nameOf(v),
			appearance,
			raw,
			...(italic.length > 0 && { italic }),
			...(bold.length > 0 && { bold })
		});
	}
	return out;
}

export function parseIconThemeFile(
	text: string,
	files: Map<string, Uint8Array>,
	maxVariants = 4
): IconVariant[] {
	const decoder = new TextDecoder();
	const read = (path: unknown): string | null => {
		if (typeof path !== 'string') return null;
		const file = files.get(path.replace(/^\.\//, ''));
		if (!file || file.length > MAX_SVG_BYTES) return null;
		const svg = decoder.decode(file);
		return svg.includes('<svg') ? svg : null;
	};

	return (
		variantsOf(text)
			.map((v) => {
				const icons = v.file_icons ?? {};
				const suffixes = v.file_suffixes ?? {};
				return {
					name: nameOf(v),
					appearance: appearanceOf(v),
					folder: read(v.directory_icons?.collapsed),
					files: FILE_SAMPLES.map((f) => {
						const key = suffixes[f.suffix];
						return { label: f.label, svg: typeof key === 'string' ? read(icons[key]?.path) : null };
					})
				};
			})
			// A variant with nothing to show would render as an empty box
			.filter((v) => v.folder || v.files.some((f) => f.svg))
			.slice(0, maxVariants)
	);
}

/** How a preview token of `role` should be drawn in this variant. */
export function fontStyleOf(v: ThemeVariant, role: string): { italic: boolean; bold: boolean } {
	return {
		italic: (v.italic as string[] | undefined)?.includes(role) ?? false,
		bold: (v.bold as string[] | undefined)?.includes(role) ?? false
	};
}

/** For <img src>: an SVG shown as an image can't run scripts or touch the page. */
export function svgDataUri(svg: string): string {
	return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
