<script lang="ts">
	let { html }: { html: string } = $props();
</script>

<article class="readme-content">
	{@html html}
</article>

<style>
	/* GitHub-flavored markdown styles */
	.readme-content {
		font-family: var(--font-sans);
		font-size: 15px;
		line-height: 1.7;
		color: var(--color-text);
		word-wrap: break-word;
	}

	/* Headings */
	.readme-content :global(h1),
	.readme-content :global(h2),
	.readme-content :global(h3),
	.readme-content :global(h4),
	.readme-content :global(h5),
	.readme-content :global(h6) {
		font-weight: 600;
		line-height: 1.3;
		margin-top: 1.5em;
		margin-bottom: 0.75em;
		letter-spacing: -0.01em;
	}

	.readme-content :global(h1) {
		font-size: 1.75em;
		padding-bottom: 0.4em;
		border-bottom: 1px solid var(--color-border);
	}

	.readme-content :global(h2) {
		font-size: 1.4em;
		padding-bottom: 0.35em;
		border-bottom: 1px solid var(--color-border);
	}

	.readme-content :global(h3) {
		font-size: 1.15em;
	}
	.readme-content :global(h4) {
		font-size: 1em;
	}

	.readme-content :global(h1:first-child),
	.readme-content :global(h2:first-child) {
		margin-top: 0;
	}

	/* Paragraphs */
	.readme-content :global(p) {
		margin-top: 0;
		margin-bottom: 1em;
	}

	/* Links */
	.readme-content :global(a) {
		color: var(--color-accent);
		text-decoration: none;
	}

	.readme-content :global(a:hover) {
		text-decoration: underline;
	}

	/* Images */
	.readme-content :global(img) {
		max-width: 100%;
		height: auto;
		border-radius: 8px;
		border: 1px solid var(--color-border);
		margin: 0.5em 0;
	}

	/* Inline code */
	.readme-content :global(code) {
		font-family: var(--font-mono);
		font-size: 0.875em;
		padding: 0.15em 0.4em;
		background: oklch(0.96 0.004 75);
		border-radius: 6px;
	}

	/* Code blocks */
	.readme-content :global(pre) {
		margin: 1em 0;
		padding: 0;
		border-radius: 8px;
		border: 1px solid var(--color-border);
		background: oklch(0.975 0.004 75);
		overflow: hidden;
	}

	.readme-content :global(pre code) {
		display: block;
		padding: 1em;
		overflow-x: auto;
		background: transparent;
		border-radius: 0;
		font-size: 13px;
		line-height: 1.6;
	}

	.readme-content :global(.shiki) {
		padding: 1em;
		margin: 0;
		overflow-x: auto;
		border-radius: 8px;
		font-size: 13px;
		line-height: 1.6;
	}

	/* Lists */
	.readme-content :global(ul),
	.readme-content :global(ol) {
		margin-top: 0;
		margin-bottom: 1em;
		padding-left: 2em;
	}

	.readme-content :global(li) {
		margin-top: 0.25em;
	}

	.readme-content :global(li + li) {
		margin-top: 0.4em;
	}

	/* Blockquotes */
	.readme-content :global(blockquote) {
		margin: 1em 0;
		padding: 0.5em 1em;
		border-left: 3px solid var(--color-accent);
		color: var(--color-text-secondary);
		background: oklch(0.98 0.004 75);
		border-radius: 0 6px 6px 0;
	}

	.readme-content :global(blockquote p:last-child) {
		margin-bottom: 0;
	}

	/* Tables */
	.readme-content :global(table) {
		display: block;
		width: max-content;
		max-width: 100%;
		overflow: auto;
		border-collapse: collapse;
		margin: 1em 0;
	}

	.readme-content :global(th),
	.readme-content :global(td) {
		padding: 0.5em 1em;
		border: 1px solid var(--color-border);
		font-size: 0.9em;
	}

	.readme-content :global(th) {
		font-weight: 600;
		background: oklch(0.975 0.004 75);
	}

	.readme-content :global(tr:nth-child(even)) {
		background: oklch(0.985 0.002 75);
	}

	/* Horizontal rules */
	.readme-content :global(hr) {
		height: 1px;
		background: var(--color-border);
		border: 0;
		margin: 1.5em 0;
	}

	/* Details/summary (collapsible sections) */
	.readme-content :global(details) {
		margin: 1em 0;
		border: 1px solid var(--color-border);
		border-radius: 8px;
		padding: 0.5em 1em;
	}

	.readme-content :global(summary) {
		cursor: pointer;
		font-weight: 600;
		padding: 0.25em 0;
	}

	/* Badge images (shields.io etc) — no border */
	.readme-content :global(img[src*='shields.io']),
	.readme-content :global(img[src*='badge']),
	.readme-content :global(img[src*='img.shields']) {
		border: none;
		border-radius: 0;
		display: inline;
		vertical-align: middle;
		margin: 0 0.15em;
	}
</style>
