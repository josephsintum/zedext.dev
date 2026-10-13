import type { ExtensionRecord } from './types.js';
import { LANGUAGE_HUBS, type LanguageHub } from './languages.js';
import { formatNumber } from './utils/format.js';
import { hasKeyword, nameWords } from './words.js';

export type HubGroupKey = 'language-servers' | 'tooling' | 'syntax' | 'snippets' | 'other';

export interface HubGroup {
	key: HubGroupKey;
	title: string;
	items: ExtensionRecord[];
}

export interface Faq {
	q: string;
	a: string;
}

export interface HubData {
	groups: HubGroup[];
	total: number;
	alsoBuiltIn: string[];
	primary: ExtensionRecord | null;
	faq: Faq[];
}

const GROUP_TITLES: Record<HubGroupKey, string> = {
	'language-servers': 'Language servers',
	tooling: 'Linting & formatting',
	syntax: 'File types & syntax',
	snippets: 'Snippets',
	other: 'Other'
};
const GROUP_ORDER: HubGroupKey[] = ['language-servers', 'tooling', 'syntax', 'snippets', 'other'];
const TOOLING_WORDS = new Set([
	'lint',
	'linter',
	'format',
	'formatter',
	'fmt',
	'ruff',
	'biome',
	'prettier',
	'eslint',
	'psalm',
	'phpcs',
	'phpmd',
	'phpstan',
	'rubocop',
	'refactor',
	'refactoring',
	'clippy'
]);
const NOT_IN_HUBS = ['themes', 'icon-themes'];

export function matchesHub(hub: LanguageHub, r: ExtensionRecord): boolean {
	if (hub.exclude?.includes(r.id)) return false;
	if (r.provides.some((p) => NOT_IN_HUBS.includes(p))) return false;
	if (hub.include?.includes(r.id)) return true;
	return hasKeyword(nameWords(r), hub.keywords);
}

export interface HubSummary {
	slug: string;
	name: string;
	emoji: string;
	builtIn: boolean;
	count: number;
}

/** One card per language hub, for /languages and Discover */
export function hubSummaries(records: ExtensionRecord[]): HubSummary[] {
	return LANGUAGE_HUBS.map((hub) => ({
		slug: hub.slug,
		name: hub.name,
		emoji: hub.emoji,
		builtIn: hub.builtIn.length > 0,
		count: records.filter((r) => matchesHub(hub, r)).length
	}));
}

function groupFor(r: ExtensionRecord): HubGroupKey {
	// MCP and agent servers often have "server" in their names but aren't language servers
	if (r.provides.includes('context-servers') || r.provides.includes('agent-servers'))
		return 'other';
	const words = nameWords(r);
	if ([...words].some((w) => TOOLING_WORDS.has(w) || w.endsWith('refactoring'))) return 'tooling';
	if (r.provides.includes('snippets') || words.has('snippets')) return 'snippets';
	if (
		r.provides.includes('language-servers') ||
		words.has('lsp') ||
		words.has('ls') ||
		words.has('server')
	) {
		return 'language-servers';
	}
	if (r.provides.includes('languages') || r.provides.includes('grammars')) return 'syntax';
	return 'other';
}

function list(names: string[]): string {
	if (names.length <= 1) return names.join('');
	return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

export function buildHub(hub: LanguageHub, records: ExtensionRecord[]): HubData {
	const matched = records
		.filter((r) => matchesHub(hub, r))
		.sort((a, b) => b.download_count - a.download_count);

	const byGroup = new Map<HubGroupKey, ExtensionRecord[]>();
	for (const r of matched) {
		const key = groupFor(r);
		byGroup.set(key, [...(byGroup.get(key) ?? []), r]);
	}
	const groups = GROUP_ORDER.filter((k) => byGroup.has(k)).map((key) => ({
		key,
		title: GROUP_TITLES[key],
		items: byGroup.get(key)!
	}));

	const ids = new Set(matched.map((r) => r.id));
	const alsoBuiltIn = (hub.alsoBuiltIn ?? []).filter((id) => ids.has(id));
	const primary = hub.primary ? (records.find((r) => r.id === hub.primary) ?? null) : null;

	return {
		groups,
		total: matched.length,
		alsoBuiltIn,
		primary,
		faq: hubFaq(hub, groups, matched, alsoBuiltIn, primary)
	};
}

function hubFaq(
	hub: LanguageHub,
	groups: HubGroup[],
	matched: ExtensionRecord[],
	alsoBuiltIn: string[],
	primary: ExtensionRecord | null
): Faq[] {
	const name = (id: string) => matched.find((r) => r.id === id)?.name ?? id;
	const faq: Faq[] = [];

	faq.push({
		q: `Do I need an extension for ${hub.name} in Zed?`,
		a:
			hub.builtIn.length > 0
				? `No. ${hub.name} support is built into Zed: ${list(hub.builtIn)}. Extensions add alternatives and extras.`
				: primary
					? `Yes. Install the ${primary.name} extension (${formatNumber(primary.download_count)} downloads), which adds ${hub.name} support to Zed.`
					: `Zed doesn't include ${hub.name} support out of the box. The extensions below add it.`
	});

	const servers = groups.find((g) => g.key === 'language-servers')?.items ?? [];
	if (servers.length > 0) {
		const builtInNote =
			alsoBuiltIn.length > 0 ? ` ${list(alsoBuiltIn.map(name))} also ship with Zed.` : '';
		faq.push({
			q: `Which ${hub.name} language server should I use in Zed?`,
			a: `Popular language server extensions: ${list(servers.slice(0, 3).map((r) => r.name))}.${builtInNote}`
		});
	}

	if (matched.length > 0) {
		faq.push({
			q: `What are the most popular ${hub.name} extensions for Zed?`,
			a: `${list(matched.slice(0, 3).map((r) => `${r.name} (${formatNumber(r.download_count)} downloads)`))}.`
		});
	}

	return faq;
}

export function faqJsonLd(faq: Faq[]): object {
	return {
		'@context': 'https://schema.org',
		'@type': 'FAQPage',
		mainEntity: faq.map((f) => ({
			'@type': 'Question',
			name: f.q,
			acceptedAnswer: { '@type': 'Answer', text: f.a }
		}))
	};
}
