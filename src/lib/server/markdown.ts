import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';
import { createHighlighter, type Highlighter } from 'shiki';

let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter(): Promise<Highlighter> {
	if (!highlighterPromise) {
		highlighterPromise = createHighlighter({
			themes: ['github-light'],
			langs: [
				'javascript', 'typescript', 'python', 'rust', 'go', 'ruby',
				'bash', 'shell', 'json', 'toml', 'yaml', 'html', 'css',
				'lua', 'elixir', 'java', 'c', 'cpp', 'markdown', 'sql'
			]
		});
	}
	return highlighterPromise;
}

function rewriteImageUrls(markdown: string, owner: string, repo: string, branch: string): string {
	const baseUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}`;

	return markdown
		// Markdown images: ![alt](./path) or ![alt](path)
		.replace(
			/!\[([^\]]*)\]\((?!https?:\/\/|data:)([^)]+)\)/g,
			(_, alt, path) => `![${alt}](${baseUrl}/${path.replace(/^\.\//, '')})`
		)
		// HTML img src: <img src="path">
		.replace(
			/src="(?!https?:\/\/|data:)([^"]+)"/g,
			(_, path) => `src="${baseUrl}/${path.replace(/^\.\//, '')}"`
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
				return highlighter.codeToHtml(text, { lang: language, theme: 'github-light' });
			}
		} catch { /* fallback to plain */ }
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
	const clean = DOMPurify.sanitize(rawHtml, {
		ADD_TAGS: ['pre', 'code', 'span'],
		ADD_ATTR: ['class', 'style'],
		ALLOW_DATA_ATTR: false,
		FORBID_TAGS: ['script', 'iframe', 'form', 'input', 'textarea'],
		FORBID_ATTR: ['onclick', 'onload', 'onerror']
	});

	// Add target="_blank" to external links
	return clean.replace(
		/<a\s+href="(https?:\/\/[^"]+)"/g,
		'<a href="$1" target="_blank" rel="noopener noreferrer"'
	);
}
