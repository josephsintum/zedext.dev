import type { HomeData } from './home.js';
import { themeHref } from '$lib/theme-picker.js';
import { formatNumber } from '$lib/utils/format.js';

const SITE = 'https://zedext.dev';

/** Registry text inside Markdown: one line, and nothing read as formatting or a link */
function inline(text: string | null): string {
	return (text ?? '')
		.replace(/\s+/g, ' ')
		.trim()
		.replace(/[\\`*_[\]<>#|]/g, (c) => `\\${c}`);
}

function extensionLine(e: {
	id: string;
	name: string;
	description?: string | null;
	download_count: number;
}) {
	const about = e.description ? `: ${inline(e.description)}` : '';
	return `- [${inline(e.name)}](${SITE}/extensions/${e.id})${about} (${formatNumber(e.download_count)} downloads)`;
}

/** The homepage for agents that send Accept: text/markdown */
export function homeMarkdown(home: HomeData): string {
	const count = home.extensionCount.toLocaleString('en-US');
	const lines = [
		'# ZedExt: extensions for the Zed editor',
		'',
		`> Every extension in Zed’s registry (${count} today), ranked by downloads, with theme previews and setup guides. Updated nightly. An unofficial community project, not affiliated with Zed Industries.`,
		'',
		`- Search all extensions: ${SITE}/extensions?q={query}`,
		`- Every extension as JSON: ${SITE}/extensions.json`,
		`- About ZedExt for agents: ${SITE}/llms.txt`,
		''
	];

	if (home.featured.length > 0) {
		lines.push('## Featured', '', ...home.featured.map(extensionLine), '');
	}
	if (home.popular.length > 0) {
		lines.push('## Most popular', '', ...home.popular.map(extensionLine), '');
	}
	if (home.themes.length > 0) {
		lines.push(
			'## Themes',
			'',
			...home.themes.map(
				(t) =>
					`- [${inline(t.name)}](${SITE}${themeHref(t.id, 'dark')}) (${formatNumber(t.downloads)} downloads)`
			),
			'',
			`Preview every theme: ${SITE}/themes`,
			''
		);
	}
	if (home.guides.length > 0) {
		lines.push('## Guides', '');
		for (const g of home.guides) {
			lines.push(
				`### [${inline(g.list.title)}](${SITE}/guides/${g.list.slug})`,
				'',
				inline(g.list.description),
				''
			);
			if (g.list.builtIn) lines.push(`Built in: ${g.list.builtIn.map(inline).join(', ')}`, '');
			lines.push(...g.items.map(extensionLine), '');
		}
	}
	if (home.hubs.length > 0) {
		lines.push(
			'## Languages',
			'',
			...home.hubs.map(
				(h) => `- [${inline(h.name)}](${SITE}/languages/${h.slug}) (${h.count} extensions)`
			),
			''
		);
	}
	return lines.join('\n');
}

/** A 404 body for agents that send Accept: text/markdown */
export function notFoundMarkdown(pathname: string): string {
	return [
		'# Page not found',
		'',
		`Nothing on ZedExt lives at \`${pathname.replace(/`/g, '')}\`. The extension may have been renamed or removed from Zed’s registry, or the link may be mistyped.`,
		'',
		`- Search extensions: ${SITE}/extensions?q={query}`,
		`- Every page: ${SITE}/sitemap.xml`,
		`- How to use this site: ${SITE}/llms.txt`,
		''
	].join('\n');
}
