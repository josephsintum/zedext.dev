import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';
import { createHighlighter, type Highlighter } from 'shiki';

let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter(): Promise<Highlighter> {
	if (!highlighterPromise) {
		highlighterPromise = createHighlighter({
			themes: ['github-light', 'github-dark'],
			langs: [
				'javascript',
				'typescript',
				'python',
				'rust',
				'go',
				'ruby',
				'bash',
				'shell',
				'json',
				'toml',
				'yaml',
				'html',
				'css',
				'lua',
				'elixir',
				'java',
				'c',
				'cpp',
				'markdown',
				'sql'
			]
		});
	}
	return highlighterPromise;
}

/** GitHub's heading anchor: lowercase, punctuation dropped, each space a hyphen. */
export function headingSlug(text: string): string {
	return text
		.toLowerCase()
		.trim()
		.replace(/[^\p{L}\p{M}\p{N}\s_-]/gu, '')
		.replace(/\s/g, '-');
}

const NAMED_ENTITIES: Record<string, string> = {
	amp: '&',
	lt: '<',
	gt: '>',
	quot: '"',
	apos: "'",
	nbsp: ' '
};
/** A heading's text as GitHub slugs it: tags removed, entities decoded. */
function plainText(html: string): string {
	return html
		.replace(/<[^>]*>/g, '')
		.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, name: string) => {
			if (name[0] !== '#') return NAMED_ENTITIES[name.toLowerCase()] ?? entity;
			const code =
				name[1] === 'x' || name[1] === 'X' ? parseInt(name.slice(2), 16) : Number(name.slice(1));
			return Number.isFinite(code) ? String.fromCodePoint(code) : entity;
		});
}

/** Where a markdown file lives, so its relative links, images and anchors resolve. */
export interface MarkdownSource {
	owner: string;
	repo: string;
	branch: string;
	/** The file's folder in the repo ('' for the root) */
	dir?: string;
	/** Prefix for heading ids, unique per document on a page, so ids can't clash */
	idPrefix: string;
	/** A site that publishes these files (e.g. Zed's docs): relative links go there, minus .md */
	siteBase?: string;
}

/**
 * Where a relative URL points: a link to the file on GitHub (or on `siteBase`), an image to
 * the raw file. A leading "/" means the repo root. Absolute URLs and anchors pass through.
 */
function resolveUrl(url: string, base: string, dir: string, stripMd = false): string {
	if (/^([a-z][a-z\d+.-]*:|\/\/|#)/i.test(url)) return url;
	const path = stripMd ? url.replace(/\.md(?=$|[?#])/, '') : url;
	const folder = path.startsWith('/') || !dir ? '' : `${dir}/`;
	try {
		return new URL(path.replace(/^\/+/, ''), `${base}/${folder}`).href;
	} catch {
		return url;
	}
}

export async function renderMarkdown(markdown: string, source: MarkdownSource): Promise<string> {
	const { owner, repo, branch, dir = '', idPrefix, siteBase } = source;
	const linkFor = (url: string) =>
		siteBase
			? resolveUrl(url, siteBase.replace(/\/$/, ''), '', true)
			: resolveUrl(url, `https://github.com/${owner}/${repo}/blob/${branch}`, dir);
	const imageFor = (url: string) =>
		resolveUrl(url, `https://raw.githubusercontent.com/${owner}/${repo}/${branch}`, dir);

	// Get shiki highlighter
	const highlighter = await getHighlighter();

	// Configure marked with shiki for code blocks
	const renderer = new marked.Renderer();
	renderer.code = ({ text, lang }) => {
		const language = lang || 'text';
		try {
			const loadedLangs = highlighter.getLoadedLanguages();
			if (loadedLangs.includes(language as any)) {
				return highlighter.codeToHtml(text, {
					lang: language,
					themes: { light: 'github-light', dark: 'github-dark' },
					defaultColor: false
				});
			}
		} catch {
			/* fallback to plain */
		}
		const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
		return `<pre><code class="language-${language}">${escaped}</code></pre>`;
	};

	// GitHub-style ids, so a README's table of contents (#installation) works here too.
	// Ours carry a per-render nonce until sanitizing, which keeps only ids that have it:
	// a README's raw HTML can't set ids, so it can't take over the page's or duplicate ours
	const nonce = `md${crypto.randomUUID().replaceAll('-', '')}-`;
	const usedSlugs = new Set<string>();
	renderer.heading = function ({ tokens, depth }) {
		const html = this.parser.parseInline(tokens);
		const base = headingSlug(plainText(html));
		let slug = base;
		for (let n = 1; usedSlugs.has(slug); n++) slug = `${base}-${n}`;
		usedSlugs.add(slug);
		return `<h${depth} id="${nonce}${slug}">${html}</h${depth}>\n`;
	};

	const rawHtml = await marked(markdown, {
		renderer,
		gfm: true,
		breaks: false
	});

	// Headings shift so the document's top level is an h2 under the page's h1, and never step
	// more than one level deeper than the heading before (no h1 → h4 jumps), whatever levels
	// it uses. data-level keeps the markdown level for styling, so it still looks the way it
	// does on GitHub. Levels come from what sanitizing keeps (not comments or scripts), and
	// sanitize-html visits tags in document order
	const visible = rawHtml
		.replace(/<!--[\s\S]*?-->/g, '')
		.replace(/<(script|style|noscript|textarea|template)\b[\s\S]*?<\/\1>/gi, '');
	const levels = [...visible.matchAll(/<h([1-6])[\s>]/gi)].map((m) => Number(m[1]));
	const shift = 2 - Math.min(...levels, 6);
	let previous = 1; // the page's own h1
	const shiftHeading = (tagName: string, attribs: sanitizeHtml.Attributes) => {
		const level = Number(tagName[1]);
		previous = Math.min(Math.max(level + shift, 2), previous + 1, 6);
		const ours = attribs.id?.startsWith(nonce);
		return {
			tagName: `h${previous}`,
			attribs: {
				...(ours ? { id: idPrefix + attribs.id.slice(nonce.length) } : {}),
				'data-level': String(level)
			}
		};
	};

	const clean = sanitizeHtml(rawHtml, {
		allowedTags: sanitizeHtml.defaults.allowedTags.concat([
			'img',
			'pre',
			'code',
			'span',
			'details',
			'summary'
		]),
		allowedAttributes: {
			...sanitizeHtml.defaults.allowedAttributes,
			span: ['class', 'style'],
			code: ['class'],
			pre: ['class'],
			img: ['src', 'alt', 'width', 'height', 'loading', 'decoding'],
			a: ['href', 'target', 'rel'],
			...Object.fromEntries(['h2', 'h3', 'h4', 'h5', 'h6'].map((h) => [h, ['id', 'data-level']]))
		},
		transformTags: {
			...Object.fromEntries(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].map((h) => [h, shiftHeading])),
			a: (tagName, attribs) => {
				const href = attribs.href;
				if (!href) return { tagName, attribs };
				// "#" and "#top" scroll to the top natively; other anchors target our heading ids
				const anchor = href.startsWith('#') && href !== '#' && href.toLowerCase() !== '#top';
				return {
					tagName,
					attribs: {
						...attribs,
						href: anchor
							? `#${idPrefix}${decodeAnchor(href.slice(1))}`
							: href.startsWith('#')
								? href
								: linkFor(href)
					}
				};
			},
			// Lazy, so a README full of GIFs doesn't load them all up front. Images without alt
			// text are treated as decorative
			img: (tagName, attribs) => ({
				tagName,
				attribs: {
					...attribs,
					src: attribs.src ? imageFor(attribs.src) : '',
					alt: attribs.alt ?? '',
					loading: 'lazy',
					decoding: 'async'
				}
			})
		},
		// Only Shiki's classes and token colors (its <pre> background is left to our styles).
		// READMEs can contain raw HTML, and a free-form style or a site class
		// (e.g. "fixed inset-0") would let one draw over the whole page
		allowedClasses: {
			span: ['line'],
			code: ['language-*'],
			pre: ['shiki', 'shiki-themes', 'github-light', 'github-dark']
		},
		allowedStyles: {
			span: {
				'--shiki-light': [HEX_COLOR],
				'--shiki-dark': [HEX_COLOR]
			}
		},
		allowedSchemes: ['http', 'https', 'mailto']
	});

	// Add target="_blank" to external links
	const linked = clean.replace(
		/<a\s+href="(https?:\/\/[^"]+)"/g,
		'<a href="$1" target="_blank" rel="noopener noreferrer"'
	);
	return markImageLinks(renderAlerts(linked));
}

/**
 * Tags links that hold only images (logos, badges), so the README styles can leave them
 * without an underline. CSS alone can't tell those from a link with an icon and a label.
 * Runs after sanitizing, so the class is ours, not the README's.
 */
export function markImageLinks(html: string): string {
	return html.replace(
		/<a ([^>]*)>((?:\s*<img\b[^>]*>)+\s*)<\/a>/g,
		(_, attrs: string, images: string) => {
			// Badges often have no alt text; name the link after where it goes instead
			const named = /\balt="[^"]+"/.test(images);
			const href = /\bhref="([^"]*)"/.exec(attrs)?.[1];
			const label = !named && href ? ` aria-label="${href.replace(/^https?:\/\//, '')}"` : '';
			return `<a class="image-link"${label} ${attrs}>${images}</a>`;
		}
	);
}

function decodeAnchor(fragment: string): string {
	try {
		return decodeURIComponent(fragment).toLowerCase();
	} catch {
		return fragment.toLowerCase();
	}
}

const HEX_COLOR = /^#[0-9a-f]{3,8}$/i;

const ALERT_TITLES: Record<string, string> = {
	note: 'Note',
	tip: 'Tip',
	important: 'Important',
	warning: 'Warning',
	caution: 'Caution'
};

/**
 * GitHub's `> [!NOTE]` callouts. marked leaves the marker as text at the start of the quote;
 * it runs after sanitizing, so the classes added here are ours, not the README's. Like GitHub,
 * the marker must be alone on its line.
 */
export function renderAlerts(html: string): string {
	return html.replace(
		/<blockquote>\s*<p>\[!(note|tip|important|warning|caution)\][ \t]*(?:(\n)|<\/p>\s*(<p>)?)/gi,
		(_, type: string, sameParagraph?: string, nextParagraph?: string) => {
			const key = type.toLowerCase();
			// Text on the next line stays in this paragraph; after </p>, reopen only if text follows
			const open = sameParagraph || nextParagraph ? '<p>' : '';
			return `<blockquote class="alert alert-${key}"><p class="alert-title">${ALERT_TITLES[key]}</p>${open}`;
		}
	);
}
