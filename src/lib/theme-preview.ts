/**
 * Theme and icon-theme previews, parsed from the JSON files in an extension's published
 * archive. Everything here is untrusted third-party data: colors must be plain hex, and
 * SVGs are only ever shown through <img> data URIs (see svgDataUri), never inlined.
 */

export interface ThemeColors {
	bg: string;
	fg: string;
	gutter: string;
	status: string;
	border: string;
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

export interface ThemeVariant {
	name: string;
	appearance: 'light' | 'dark';
	colors: ThemeColors;
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

export function parseThemeFile(text: string): ThemeVariant[] {
	const out: ThemeVariant[] = [];
	for (const v of variantsOf(text)) {
		const style = v.style ?? {};
		const syntax = style.syntax ?? {};
		const s = (key: string) => hex(syntax[key]?.color);
		const bg = hex(style['editor.background']) ?? hex(style['background']);
		const fg = hex(style['editor.foreground']) ?? hex(style['text']);
		if (!bg || !fg) continue; // nothing sensible to draw
		const comment = s('comment') ?? fg;
		const appearance = appearanceOf(v);
		const status = hex(style['status_bar.background']) ?? hex(style['title_bar.background']) ?? bg;
		const roles = Object.keys(SYNTAX_KEYS) as StyledRole[];
		const italic = roles.filter((r) => syntax[SYNTAX_KEYS[r]]?.font_style === 'italic');
		const bold = roles.filter((r) => isBold(syntax[SYNTAX_KEYS[r]]?.font_weight));
		out.push({
			name: nameOf(v),
			appearance,
			colors: {
				bg: opaque(bg, appearance),
				fg,
				gutter: hex(style['editor.line_number']) ?? comment,
				status: opaque(status, appearance),
				border: hex(style['border']) ?? comment,
				keyword: s('keyword') ?? fg,
				string: s('string') ?? fg,
				function: s('function') ?? fg,
				type: s('type') ?? fg,
				comment,
				number: s('number') ?? fg,
				punct: s('punctuation') ?? fg,
				variable: s('variable') ?? fg,
				...Object.fromEntries(
					EXTRA_ROLES.flatMap((r) => {
						const color = s(SYNTAX_KEYS[r]);
						return color ? [[r, color]] : [];
					})
				)
			},
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
