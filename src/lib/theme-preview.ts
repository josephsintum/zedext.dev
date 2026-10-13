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
}

export interface ThemeVariant {
	name: string;
	appearance: 'light' | 'dark';
	colors: ThemeColors;
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
	style?: Record<string, unknown> & { syntax?: Record<string, { color?: unknown } | undefined> };
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
		out.push({
			name: nameOf(v),
			appearance: appearanceOf(v),
			colors: {
				bg,
				fg,
				gutter: hex(style['editor.line_number']) ?? comment,
				status: hex(style['status_bar.background']) ?? hex(style['title_bar.background']) ?? bg,
				border: hex(style['border']) ?? comment,
				keyword: s('keyword') ?? fg,
				string: s('string') ?? fg,
				function: s('function') ?? fg,
				type: s('type') ?? fg,
				comment,
				number: s('number') ?? fg,
				punct: s('punctuation') ?? fg,
				variable: s('variable') ?? fg
			}
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

	return variantsOf(text)
		.slice(0, maxVariants)
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
		});
}

/** Card strip: background plus four syntax colors from the first variant. */
export function swatchOf(variants: ThemeVariant[]): string[] | undefined {
	const c = variants[0]?.colors;
	return c ? [c.bg, c.keyword, c.string, c.function, c.type] : undefined;
}

/** For <img src>: an SVG shown as an image can't run scripts or touch the page. */
export function svgDataUri(svg: string): string {
	return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
