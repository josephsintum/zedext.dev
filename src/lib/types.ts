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

// --- Search snapshot ---

export interface ExtensionRecord {
	id: string;
	name: string;
	description: string | null;
	authors: string[];
	provides: string[];
	download_count: number;
	github_stars: number;
	github_license: string | null;
	github_pushed_at: string | null;
	published_at: string;
	/** Release date of the extension's first version; null until the sync has looked it up */
	first_published_at: string | null;
	version: string;
	repository: string | null;
	/** Where the extension's changelog comes from; null = checked, none; absent = not checked yet */
	changelog?: ChangelogSource | null;
}

export type ChangelogSource = 'file' | 'releases';

export interface Snapshot {
	generatedAt: string;
	extensions: ExtensionRecord[];
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
	archived: boolean;
	html_url: string;
}

export interface GitHubReadme {
	content: string; // base64 encoded
	/** Where GitHub found it, e.g. "README.md" or ".github/README.md" */
	path: string;
	encoding: string;
	download_url: string;
}

export interface GitHubRelease {
	tag_name: string;
	name: string | null;
	body: string | null;
	published_at: string | null;
	draft: boolean;
}

// --- GitHub User types ---

export interface GitHubUser {
	login: string;
	name: string | null;
	avatar_url: string;
	html_url: string;
	bio: string | null;
	public_repos: number;
	followers: number;
	company: string | null;
	location: string | null;
	blog: string | null;
}

// --- UI types ---

export type ExtensionHit = ExtensionRecord;

/** What an extension card shows; pages that only list cards ship just these fields */
export type ExtensionCardData = Pick<
	ExtensionRecord,
	| 'id'
	| 'name'
	| 'description'
	| 'authors'
	| 'provides'
	| 'download_count'
	| 'github_stars'
	| 'version'
>;

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
