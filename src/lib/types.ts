// --- Zed API response types ---

export type ProvideKind =
	| 'themes'
	| 'icon-themes'
	| 'languages'
	| 'grammars'
	| 'language-servers'
	| 'context-servers'
	| 'agent-servers'
	| 'slash-commands'
	| 'indexed-docs-providers'
	| 'snippets'
	| 'debug-adapters';

export interface ZedExtension {
	id: string;
	name: string;
	version: string;
	description: string | null;
	authors: string[];
	repository: string;
	schema_version: number;
	wasm_api_version: string | null;
	provides: ProvideKind[];
	published_at: string;
	download_count: number;
}

export interface ZedExtensionResponse {
	data: ZedExtension[];
}

// --- Algolia index document ---

export interface AlgoliaExtension {
	objectID: string;
	name: string;
	description: string | null;
	authors: string[];
	provides: string[];
	download_count: number;
	github_stars: number;
	github_license: string | null;
	github_pushed_at: string | null;
	published_at: string;
	published_at_timestamp: number;
	version: string;
	repository: string | null;
}

// --- GitHub API types ---

export interface GitHubRepo {
	stargazers_count: number;
	forks_count: number;
	open_issues_count: number;
	license: { spdx_id: string } | null;
	pushed_at: string;
	default_branch: string;
	description: string | null;
	topics: string[];
}

export interface GitHubReadme {
	content: string; // base64 encoded
	encoding: string;
	download_url: string;
}

// --- UI types ---

export interface ExtensionHit extends AlgoliaExtension {
	_highlightResult?: Record<string, { value: string; matchLevel: string }>;
}

export interface SearchResults {
	hits: ExtensionHit[];
	nbHits: number;
	nbPages: number;
	page: number;
	facets: Record<string, Record<string, number>>;
}

export interface ExtensionDetail {
	extension: ZedExtension;
	versions: ZedExtension[];
	github: GitHubRepo | null;
	readmeHtml: string | null;
}
