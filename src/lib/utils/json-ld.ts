/** JSON for a <script type="application/ld+json"> tag: "<" is escaped so data can't close the tag. */
export function serializeJsonLd(data: unknown): string {
	return JSON.stringify(data).replace(/</g, '\\u003c');
}

/**
 * The full <script> tag, for {@html} in <svelte:head>. Built here rather than in markup
 * because Svelte tooling (ESLint's parser) can't parse a literal <script> inside {@html}.
 */
export function jsonLdScriptTag(data: unknown): string {
	return `<script type="application/ld+json">${serializeJsonLd(data)}</script>`;
}
