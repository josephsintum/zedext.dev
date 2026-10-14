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

function rewriteImageUrls(markdown: string, owner: string, repo: string, branch: string): string {
	const baseUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}`;

	return (
		markdown
			// Markdown images: ![alt](./path) or ![alt](path)
			.replace(
				/!\[([^\]]*)\]\((?!https?:\/\/|data:)([^)]+)\)/g,
				(_, alt, path) => `![${alt}](${baseUrl}/${path.replace(/^\.\//, '')})`
			)
			// HTML img src: <img src="path">
			.replace(
				/src="(?!https?:\/\/|data:)([^"]+)"/g,
				(_, path) => `src="${baseUrl}/${path.replace(/^\.\//, '')}"`
			)
	);
}

export async function renderMarkdown(
	markdown: string,
	owner: string,
	repo: string,
	branch: string
): Promise<string> {
	// Rewrite relative image URLs
	const rewritten = rewriteImageUrls(markdown, owner, repo, branch);

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
		const escaped = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
		return `<pre><code class="language-${language}">${escaped}</code></pre>`;
	};

	// Render markdown to HTML
	const rawHtml = await marked(rewritten, {
		renderer,
		gfm: true,
		breaks: false
	});

	// Sanitize HTML
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
			img: ['src', 'alt', 'width', 'height'],
			a: ['href', 'target', 'rel']
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
	return renderAlerts(linked);
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
