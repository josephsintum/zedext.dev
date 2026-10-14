import type { ExtensionRecord } from './types.js';

/**
 * Written guides for workflow pages (/discover/<slug>): an intro, then hand-picked groups with
 * a reason for each pick. Every other extension the list's rule matches is listed after the
 * groups, so new extensions still show up without editing this file.
 */

export interface GuidePick {
	id: string;
	/** One line on what it does and why you'd want it */
	why: string;
}

export interface GuideGroup {
	title: string;
	blurb: string;
	picks: GuidePick[];
}

export interface Guide {
	intro: string;
	groups: GuideGroup[];
}

export interface BuiltGuide {
	intro: string;
	groups: { title: string; blurb: string; picks: { record: ExtensionRecord; why: string }[] }[];
	/** Matched extensions not picked above, by downloads */
	rest: ExtensionRecord[];
}

/** Picks come only from what the list matches, so a guide never shows a hidden extension. */
export function buildGuide(guide: Guide, matched: ExtensionRecord[]): BuiltGuide {
	const byId = new Map(matched.map((r) => [r.id, r]));
	const picked = new Set<string>();
	const groups = guide.groups
		.map((g) => ({
			title: g.title,
			blurb: g.blurb,
			picks: g.picks.flatMap((p) => {
				const record = byId.get(p.id);
				if (!record) return [];
				picked.add(p.id);
				return [{ record, why: p.why }];
			})
		}))
		.filter((g) => g.picks.length > 0);
	const rest = matched
		.filter((r) => !picked.has(r.id))
		.sort((a, b) => b.download_count - a.download_count);
	return { intro: guide.intro, groups, rest };
}

export const GUIDES: Record<string, Guide> = {
	'ai-agents': {
		intro:
			'Zed’s agent panel works out of the box, and Claude Code, Codex and Gemini CLI install from the ACP Registry, not as extensions. What extensions add is reach: MCP servers let any agent read current docs, search the web, drive a browser or query your database. Start with one or two from the groups below. Each server you add is another set of tools the agent has to choose from.',
		groups: [
			{
				title: 'Current docs',
				blurb:
					'Models know libraries as they were at training time. These servers fetch the docs for the version you actually use.',
				picks: [
					{
						id: 'mcp-server-context7',
						why: 'Docs for thousands of libraries. Most people start here.'
					},
					{ id: 'svelte-mcp', why: 'The official Svelte server, set up for you.' },
					{ id: 'mcp-server-nextjs', why: 'Next.js docs plus dev-server diagnostics.' },
					{ id: 'shadcn-mcp', why: 'Browse and install shadcn/ui components.' },
					{ id: 'bun-docs-mcp', why: 'Bun’s documentation.' }
				]
			},
			{
				title: 'Search and read the web',
				blurb: 'For questions your code can’t answer. Pick one search provider; they overlap.',
				picks: [
					{ id: 'mcp-server-brave-search', why: 'Web search through the Brave Search API.' },
					{ id: 'mcp-server-exa-search', why: 'Search plus full-page fetching.' },
					{ id: 'mcp-server-tavily', why: 'Search built for agents.' },
					{ id: 'kagimcp', why: 'Kagi search, if you already pay for it.' },
					{ id: 'mcp-server-firecrawl', why: 'Turns whole sites into clean text.' }
				]
			},
			{
				title: 'Drive a browser',
				blurb:
					'Let the agent open your app, click through it and read the console while it fixes a bug.',
				picks: [
					{ id: 'mcp-server-playwright', why: 'Scripted browsing with Playwright.' },
					{
						id: 'chrome-devtools-mcp',
						why: 'Console, network and performance from Chrome DevTools.'
					},
					{
						id: 'browser-tools-context-server',
						why: 'Logs and screenshots from your open browser.'
					},
					{ id: 'mcp-server-puppeteer', why: 'Headless Chrome via Puppeteer.' }
				]
			},
			{
				title: 'Your code host and team tools',
				blurb: 'Read issues and PRs, or pull context from where your team writes things down.',
				picks: [
					{ id: 'mcp-server-github', why: 'Issues, pull requests and repos on GitHub.' },
					{ id: 'mcp-server-gitlab', why: 'The same for GitLab.' },
					{ id: 'mcp-server-figma', why: 'Design data from Figma frames.' },
					{ id: 'mcp-server-notion', why: 'Your Notion pages and databases.' },
					{ id: 'mcp-server-slack', why: 'Messages and channels from Slack.' }
				]
			},
			{
				title: 'Databases',
				blurb: 'Give the agent your schema so its queries and migrations match the real tables.',
				picks: [
					{ id: 'postgres-context-server', why: 'Schema and read queries for PostgreSQL.' },
					{ id: 'mcp-server-supabase', why: 'Supabase projects, tables and functions.' },
					{ id: 'mcp-planetscale', why: 'PlanetScale databases.' },
					{ id: 'prisma-mcp', why: 'Prisma migrations and databases.' },
					{ id: 'mcp-server-mysql', why: 'MySQL databases.' }
				]
			},
			{
				title: 'Production and code quality',
				blurb: 'Bring errors, dashboards and quality reports into the conversation.',
				picks: [
					{ id: 'sentry-mcp', why: 'Sentry issues and stack traces.' },
					{ id: 'mcp-server-grafana', why: 'Grafana dashboards and queries.' },
					{ id: 'datadog-mcp', why: 'Datadog metrics, logs and monitors.' },
					{ id: 'mcp-server-sonarqube', why: 'SonarQube findings for your project.' }
				]
			},
			{
				title: 'Make the agent itself better',
				blurb: 'Tools that change how the agent works rather than what it can reach.',
				picks: [
					{ id: 'serena-context-server', why: 'Symbol-level code navigation and editing.' },
					{ id: 'mcp-server-sequential-thinking', why: 'Makes the model plan step by step.' },
					{ id: 'mcp-server-container-use', why: 'Gives each agent its own container to work in.' },
					{ id: 'mcp-server-repomix', why: 'Packs a codebase into one file for the model to read.' }
				]
			}
		]
	},
	vscode: {
		intro:
			'Set "base_keymap" to "VSCode" and your shortcuts carry over; Zed’s settings importer handles much of the rest. What’s left is how Zed looks. These are the themes and file icons VS Code users install most, including ports of VS Code’s own defaults.',
		groups: []
	},
	vim: {
		intro:
			'Turn on vim_mode or helix_mode and modal editing just works, with relative line numbers and which-key built in. What’s left is your colorscheme. These are ports of Neovim themes, so Zed can look like the editor you came from.',
		groups: []
	},
	'web-frontend': {
		intro:
			'TypeScript, JavaScript, JSX and TSX, Tailwind, Prettier and ESLint already work in Zed, so a React project needs no extension at all. Add extensions for the frameworks, markup and styling languages Zed doesn’t ship, and use one formatter per language so tools don’t undo each other’s changes.',
		groups: [
			{
				title: 'Frameworks',
				blurb:
					'Component files mix template, script and style. These add the framework’s own language server, so completion and type checks work across all three.',
				picks: [
					{ id: 'vue', why: 'Vue single-file components, with the Vue language server.' },
					{ id: 'svelte', why: 'Svelte components, with the Svelte language server.' },
					{ id: 'astro', why: 'Astro components and frontmatter.' },
					{ id: 'angular', why: 'Angular templates, with the Angular language service.' },
					{ id: 'ember', why: 'Highlighting for Ember and Glimmer templates.' }
				]
			},
			{
				title: 'Markup and styles',
				blurb: 'HTML and Sass aren’t built in. HTML is the most installed Zed extension of all.',
				picks: [
					{ id: 'html', why: 'HTML highlighting and the HTML language server.' },
					{ id: 'emmet', why: 'Expand Emmet abbreviations into HTML and CSS.' },
					{ id: 'scss', why: 'SCSS and Sass syntax and completions.' },
					{ id: 'unocss', why: 'Completions and hovers for UnoCSS utilities.' },
					{ id: 'css-modules-kit', why: 'Go to definition and checks for CSS Modules.' },
					{ id: 'stylelint', why: 'Stylelint diagnostics as you type.' }
				]
			},
			{
				title: 'Faster linting and formatting',
				blurb:
					'Prettier and ESLint are built in. Biome and Oxc are faster alternatives written in Rust. If you add one, set it as the formatter for those languages so Prettier doesn’t format the same files.',
				picks: [
					{ id: 'biome', why: 'Formatter and linter in one tool.' },
					{ id: 'oxc', why: 'Oxlint and Oxfmt, from the Oxc project.' }
				]
			},
			{
				title: 'Data and APIs',
				blurb: 'Schemas and runtimes that sit next to your frontend code.',
				picks: [
					{ id: 'prisma', why: 'Prisma schema files, with the Prisma language server.' },
					{ id: 'graphql', why: 'GraphQL schemas and queries.' },
					{ id: 'deno', why: 'Deno’s language server, for Deno projects.' }
				]
			},
			{
				title: 'Snippets',
				blurb: 'Ready-made shortcuts for component boilerplate.',
				picks: [
					{ id: 'react-typescript-snippets', why: 'React components and hooks in TypeScript.' },
					{ id: 'react-snippets-es7', why: 'The ES7+ React/Redux snippets from VS Code.' },
					{ id: 'vue-snippets', why: 'Vue 3 snippets.' },
					{ id: 'svelte-snippets', why: 'Svelte snippets.' },
					{ id: 'html-snippets', why: 'Common HTML boilerplate.' }
				]
			}
		]
	},
	devops: {
		intro:
			'YAML, JSON and Bash are built in, and Zed can edit over SSH and inside dev containers. Most DevOps work happens in files Zed doesn’t highlight on its own: Dockerfiles, Terraform, Makefiles and TOML. Two of these, TOML and Dockerfile, are among the most installed Zed extensions.',
		groups: [
			{
				title: 'Containers',
				blurb: 'The files that define your images and local stacks.',
				picks: [
					{
						id: 'dockerfile',
						why: 'Dockerfiles with a language server, plus Docker Compose support.'
					},
					{ id: 'docker-compose', why: 'Highlighting for Compose files.' }
				]
			},
			{
				title: 'Infrastructure as code',
				blurb: 'Completion and validation catch mistakes before a plan or deploy does.',
				picks: [
					{ id: 'terraform', why: 'Terraform, with the Terraform language server.' },
					{ id: 'nix', why: 'Nix expressions, with a Nix language server.' },
					{ id: 'ansible', why: 'Ansible playbooks. Its README lists recommended settings.' },
					{ id: 'helm', why: 'Helm chart templates.' }
				]
			},
			{
				title: 'CI pipelines',
				blurb: 'Pipeline files fail late, on the server. These check them as you type.',
				picks: [
					{ id: 'github-actions', why: 'Completion and validation for GitHub Actions workflows.' },
					{ id: 'gitlab-ci-ls', why: 'A language server for .gitlab-ci.yml.' }
				]
			},
			{
				title: 'Config files',
				blurb: 'The small files every project has.',
				picks: [
					{ id: 'toml', why: 'TOML highlighting. Add Tombi for a language server.' },
					{ id: 'tombi', why: 'TOML formatting, linting and schema completion.' },
					{ id: 'ini', why: 'ini, conf and cfg files, plus systemd units.' },
					{ id: 'env', why: '.env files.' },
					{ id: 'nginx', why: 'Nginx configuration.' }
				]
			},
			{
				title: 'Build tools',
				blurb: 'Task runners you call from the terminal.',
				picks: [
					{ id: 'make', why: 'Makefile highlighting.' },
					{ id: 'just', why: 'Justfiles, with a language server.' }
				]
			}
		]
	},
	writing: {
		intro:
			'Markdown preview and Mermaid diagrams are built in. Extensions add other document formats, note-taking features and spell checkers that understand code.',
		groups: [
			{
				title: 'Notes in Markdown',
				blurb: 'Turn a folder of Markdown files into a linked notebook.',
				picks: [
					{
						id: 'markdown-oxide',
						why: 'Obsidian-style notes: wiki links, backlinks and daily notes.'
					},
					{ id: 'mermaid', why: 'Highlighting for Mermaid diagram code.' },
					{ id: 'markdown-snippets', why: 'Shortcuts for common Markdown.' }
				]
			},
			{
				title: 'Papers and docs',
				blurb: 'Formats for longer documents, from academic papers to project docs.',
				picks: [
					{ id: 'latex', why: 'LaTeX with a language server. Its GitHub wiki covers setup.' },
					{ id: 'typst', why: 'Typst documents, with a language server.' },
					{ id: 'asciidoc', why: 'AsciiDoc syntax and snippets.' },
					{ id: 'rst', why: 'reStructuredText, common in Python docs.' },
					{ id: 'org', why: 'Org Mode files.' }
				]
			},
			{
				title: 'Spelling and style',
				blurb:
					'Pick one spell checker. Codebook and Typos are built for code, so they rarely flag identifiers. Harper also checks grammar.',
				picks: [
					{ id: 'codebook', why: 'Checks comments and strings without flagging code.' },
					{ id: 'typos', why: 'Few false positives in source code.' },
					{ id: 'harper', why: 'Offline grammar and spelling for prose.' },
					{ id: 'cspell', why: 'The CSpell checker many VS Code users know.' },
					{ id: 'vale', why: 'Style rules for docs, such as a house style guide.' }
				]
			}
		]
	}
};
