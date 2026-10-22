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

const SITE = 'https://zedext.dev/';
const REPO = 'https://github.com/josephsintum/zedext.dev';

/**
 * Who and what zedext.dev is, for the homepage: the site with its search box, and the
 * project behind it. There's no company, postal address or email; support is GitHub issues.
 */
export function siteJsonLd(description: string): object {
	return {
		'@context': 'https://schema.org',
		'@graph': [
			{
				'@type': 'WebSite',
				'@id': `${SITE}#website`,
				name: 'ZedExt',
				url: SITE,
				description,
				inLanguage: 'en',
				publisher: { '@id': `${SITE}#organization` },
				about: {
					'@type': 'SoftwareApplication',
					name: 'Zed',
					applicationCategory: 'DeveloperApplication',
					url: 'https://zed.dev'
				},
				potentialAction: {
					'@type': 'SearchAction',
					target: {
						'@type': 'EntryPoint',
						urlTemplate: `${SITE}extensions?q={search_term_string}`
					},
					'query-input': 'required name=search_term_string'
				}
			},
			{
				'@type': 'Organization',
				'@id': `${SITE}#organization`,
				name: 'ZedExt',
				url: SITE,
				logo: `${SITE}favicon.svg`,
				description: 'An unofficial community project, not affiliated with Zed Industries.',
				sameAs: [REPO],
				contactPoint: {
					'@type': 'ContactPoint',
					contactType: 'customer support',
					url: `${REPO}/issues`,
					availableLanguage: 'en'
				}
			}
		]
	};
}
