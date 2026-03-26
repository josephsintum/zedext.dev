# ZedExt — Design Document

**An alternative extension marketplace for the Zed editor**

---

## 1. Problem Statement

Zed's extension page at [zed.dev/extensions](https://zed.dev/extensions) provides a poor discovery and evaluation experience. Each extension page shows only a name, one-line description, author, version, download count, and a `provides` tag. There is no README rendering, no GitHub statistics, no version history UI, no ratings, and search is basic fuzzy matching that produces noisy results.

By contrast, the VS Code Marketplace and npmx.dev offer rich README rendering, download trend charts, version selectors, dependency info, code browsers, and powerful search with faceted filtering.

---

## 2. Background

Zed is a high-performance code editor built in Rust that has been gaining traction as a VS Code alternative. As of March 2026, the extension registry has ~1,600+ extensions covering themes, language servers, MCP servers, debug adapters, and more. The community is active — extensions are submitted via PR to `zed-industries/extensions` on GitHub.

However, the extension discovery experience has not kept pace with the ecosystem's growth. Community complaints include:

- **Poor search:** Fuzzy matching produces irrelevant results. Searching "theme" returns unrelated extensions with long enough names to match.
- **No extension detail:** The detail page shows the same sparse metadata as the listing — no README, no screenshots, no changelog.
- **Installation reliability:** On Windows, install buttons sometimes silently fail. Network timeouts and ISP-level blocking of the extension repo are common.
- **Editor freezing:** Downloading extension dependencies (like language servers) blocks all editor input until complete (P2 bug, Jan 2026).
- **Broken web-to-editor flow:** The "Install in Zed" button on zed.dev doesn't work when Zed is already open (confirmed P3 bug).
- **No discoverability signals:** No categories, ratings, download counts on listing cards, or popularity indicators.

There is no third-party alternative. The only way to discover Zed extensions is through the barebones zed.dev/extensions page or word of mouth.

---

## 3. Goals

1. **Rich extension pages:** Render the full README from each extension's GitHub repository, with syntax-highlighted code blocks and properly resolved images.
2. **Better search:** Typo-tolerant, faceted search with category filters (themes, language servers, etc.) and multiple sort options.
3. **GitHub context:** Show stars, license, last commit date, forks, and open issues — so users can assess extension health before installing.
4. **Version history:** Display all published versions with dates, so users can see release cadence and track changes.
5. **Download trends:** Snapshot download counts over time and visualize as sparkline charts.
6. **Fast and accessible:** Pages load in under 1 second (SSR), work on mobile, and are fully keyboard-navigable.
7. **SEO-optimized:** Each extension has a unique, indexable page with proper meta/OG tags — so extensions are discoverable via Google.
8. **Low operating cost:** Target < $10/month total infrastructure (Fly.io hobby tier + Algolia free tier).
9. **Data freshness:** Extension data no more than 6 hours stale; GitHub metadata no more than 24 hours stale.
10. **Complete coverage:** Index all ~1,600+ extensions, not just the top 1,000 returned by the Zed API.

---

## 4. Non-Goals (v1)

- **User accounts or auth** — No login, no saved preferences, no personalized recommendations.
- **Ratings or reviews** — Requires auth and moderation. Deferred to a future phase.
- **Extension publishing** — We are read-only consumers of the Zed registry. Authors continue to publish via PR to `zed-industries/extensions`.
- **In-browser extension installation** — We link to `zed://extensions/{id}` but don't attempt to fix Zed's broken deep-link handling.
- **Code browser** — Browsing extension source code (like npmx.dev's code tab) is interesting but not MVP.
- **Changelog parsing** — Extracting structured changelogs from GitHub releases or commit history is unreliable and out of scope.
- **i18n / localization** — English only.

---

## 5. User Scenarios

### Scenario A: Discovering a theme

A user opens ZedExt and sees the browse page with ~1,600 extensions. They click the "Themes" category tab, which filters to ~589 results. They sort by "Stars" to see the most popular. They click "Catppuccin" and land on a detail page showing the full README with preview screenshots of all four color variants, 755 GitHub stars, MIT license, and version history showing 22 releases. They click "Install in Zed" which opens `zed://extensions/catppuccin` in their editor.

### Scenario B: Searching for language support

A developer needs Elixir support for Zed. They type "elxir" (typo) in the search bar. Algolia's typo tolerance still returns "Elixir" as the top result. The card shows it provides language support + language server + grammars, has 45k downloads, and was updated 2 weeks ago. They click through to the detail page, read the README to confirm it supports HEEx templates, and install it.

### Scenario C: Evaluating extension health

A user finds two competing Python extensions. They compare by looking at each detail page's sidebar: one has 200k downloads, 89 stars, was updated yesterday, and has an MIT license. The other has 5k downloads, 3 stars, hasn't been updated in 8 months, and has no license. The choice is obvious without needing a formal comparison view.

### Scenario D: Sharing an extension

A developer wants to share a Zed extension in a blog post. They copy the URL `https://zedext.dev/extensions/catppuccin` — the page has proper OG meta tags, so when pasted into Slack/Discord/Twitter, it shows a rich preview with the extension name, description, and download count.

---

## 6. Inspiration & Reference

### npmx.dev (Primary Reference)

npmx.dev is a Nuxt 4 full-stack app that wraps the npm registry with a superior browsing experience. Key architectural takeaways:

| Pattern | How npmx.dev Does It | How We Adapt It |
|---------|---------------------|-----------------|
| **No traditional DB** | All data sourced from npm registry + GitHub + Algolia at request time, cached with SWR | We use SQLite as a local enrichment cache because Zed's API lacks README/stars and GitHub is rate-limited |
| **Search** | Algolia (client-side, lite client 13KB) with npm API fallback | Same pattern: Algolia primary, Zed API as fallback |
| **Server routes** | 38 Nitro API routes aggregate/transform external data | SvelteKit server routes (`+page.server.ts`) read from SQLite |
| **Styling** | UnoCSS with CSS variable theme system (light/dark) | Tailwind CSS v4 with CSS variable theme system |
| **README rendering** | marked + sanitize-html, server-rendered | marked + DOMPurify + shiki, server-rendered with image URL rewriting |
| **Caching** | Multi-layer: fetch cache (SWR) → payload cache (ISR) → Redis | SvelteKit HTTP caching → CDN edge caching |

### VS Code Marketplace (UX Reference)

- Tabbed detail pages (Overview, Version History, Q&A, Ratings)
- Rich metadata sidebar (categories, resources, project details, compatibility)
- Star ratings and review counts
- Screenshot carousel

### Key Design Principle: Simplicity Over Infrastructure

npmx.dev wraps millions of npm packages with no traditional database — just caching. We have only ~1,600 extensions. Our architecture should be proportionally simple: one app, one database file, one search service.

---

## 7. Architecture Overview

```
┌─────────────────────────────────────────────┐
│              SvelteKit App                   │
│                                             │
│  Browser ──▶ Algolia (client-side search)   │
│  +page.server.ts ──▶ SQLite (detail pages)  │
│                                             │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│           scripts/sync.ts                    │
│                                             │
│  Zed API ───▶ SQLite                        │
│  GitHub API ──▶ SQLite     (every 6h)       │
│  SQLite ──▶ Algolia index  (after sync)     │
│                                             │
└─────────────────────────────────────────────┘

Fallback: Zed API directly from client if Algolia is unavailable
```

**One app. One database file. One search service. One cron script.**

### Component Responsibilities

| Component | Role | Deployment |
|-----------|------|------------|
| **SvelteKit App** | SSR pages, server routes reading SQLite, client-side Algolia search | Fly.io (persistent volume for SQLite) |
| **SQLite** | Local database storing enriched extension data + README + version history | File on same machine as SvelteKit |
| **Algolia** | Client-side typo-tolerant search with faceted filtering | Algolia Cloud (free tier: 10K records, 10K searches/mo) |
| **Cron script** | Syncs Zed API + GitHub data → SQLite → Algolia | Runs on same machine via system cron or GitHub Actions |

### Why Not a Separate Backend?

With Algolia handling search client-side and SQLite being a local file, SvelteKit server routes can read the database directly in `+page.server.ts`. There's nothing for a separate backend to do. The sync script is a standalone process — it doesn't need to be a web server.

---

## 8. Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Framework** | SvelteKit + TypeScript | SSR for SEO, lighter than Nuxt/Next, handles both UI and server routes |
| **Styling** | Tailwind CSS v4 | CSS-first config, fast iteration, uses CSS variables natively |
| **Database** | SQLite (WAL mode) via better-sqlite3 | Zero network latency, free, perfect for read-heavy ~1,600 row dataset |
| **Search** | Algolia (free tier) | Client-side, typo-tolerant, faceted filtering — same pattern as npmx.dev |
| **Search fallback** | Zed API (`api.zed.dev/extensions?filter=...`) | Free, no infrastructure, graceful degradation |
| **Markdown** | marked + DOMPurify + shiki | Fast parsing, safe HTML output, syntax highlighting |
| **Hosting** | Fly.io | Persistent volumes for SQLite, cheap ($3-5/mo hobby tier) |
| **Package manager** | pnpm | Fast, disk-efficient |

---

## 9. Data Sources

### 9.1 Zed Extension API (`api.zed.dev`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/extensions?max_schema_version=1` | GET | Up to 1000 extensions sorted by downloads |
| `/extensions/:id` | GET | All published versions of a single extension |
| `/extensions?filter=python&max_schema_version=1` | GET | Text search (used as Algolia fallback) |

**Response fields per extension:**

```typescript
interface ZedExtension {
  id: string;              // "html"
  name: string;            // "HTML"
  version: string;         // "0.3.1"
  description: string | null;
  authors: string[];       // ["Isaac Clayton <slightknack@gmail.com>"]
  repository: string;      // "https://github.com/zed-extensions/toml"
  schema_version: number;
  wasm_api_version: string | null;
  provides: ProvideKind[]; // ["languages", "grammars", "language-servers"]
  published_at: string;    // ISO 8601
  download_count: number;
}
```

**`provides` values:** `themes`, `icon-themes`, `languages`, `grammars`, `language-servers`, `context-servers`, `agent-servers`, `slash-commands`, `indexed-docs-providers`, `snippets`, `debug-adapters`

**Limitations:** Max 1000 results (no pagination). ~1,600+ extensions exist — must also parse `extensions.toml` from the registry for complete coverage.

### 9.2 Extensions Registry (`github.com/zed-industries/extensions`)

- **`extensions.toml`** — Complete list of ALL registered extensions (bypasses the 1000 API cap)
- **`.gitmodules`** — Maps extension submodule paths to source Git repository URLs

### 9.3 GitHub API (via `repository` URL per extension)

| Endpoint | Data | When Fetched |
|----------|------|--------------|
| `GET /repos/{owner}/{repo}` | Stars, forks, issues, license, pushed_at, topics | Sync script (daily) |
| `GET /repos/{owner}/{repo}/readme` | README markdown content | **On-demand** (when user visits detail page) |

**Rate limit:** 5000 requests/hour with authenticated token. Sync script fetches repo metadata for ~1,600 extensions = ~1,600 requests per daily sync. README fetches are on-demand and cached — realistically 50-100 per hour, well within limits.

---

## 10. Data Model

### 10.1 SQLite Schema

```sql
-- Enable WAL mode for concurrent reads during cron writes
PRAGMA journal_mode=WAL;

-- Primary table: one row per extension, latest version data
CREATE TABLE extensions (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  version           TEXT NOT NULL,
  description       TEXT,
  authors           TEXT NOT NULL DEFAULT '[]',   -- JSON array of strings
  repository        TEXT,
  schema_version    INTEGER NOT NULL DEFAULT 1,
  wasm_api_version  TEXT,
  provides          TEXT NOT NULL DEFAULT '[]',   -- JSON array of strings
  published_at      TEXT NOT NULL,                -- ISO 8601
  download_count    INTEGER NOT NULL DEFAULT 0,

  -- GitHub metadata (denormalized for fast reads)
  github_stars        INTEGER DEFAULT 0,
  github_forks        INTEGER DEFAULT 0,
  github_open_issues  INTEGER DEFAULT 0,
  github_license      TEXT,
  github_pushed_at    TEXT,
  github_topics       TEXT DEFAULT '[]',          -- JSON array
  github_default_branch TEXT DEFAULT 'main',
  github_owner        TEXT,
  github_repo         TEXT,

  -- Sync tracking
  zed_api_synced_at   TEXT,
  github_synced_at    TEXT,
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_extensions_downloads ON extensions(download_count DESC);
CREATE INDEX idx_extensions_published ON extensions(published_at DESC);
CREATE INDEX idx_extensions_stars ON extensions(github_stars DESC);

-- Version history
CREATE TABLE extension_versions (
  extension_id  TEXT NOT NULL REFERENCES extensions(id) ON DELETE CASCADE,
  version       TEXT NOT NULL,
  published_at  TEXT NOT NULL,
  PRIMARY KEY (extension_id, version)
);

CREATE INDEX idx_versions_ext ON extension_versions(extension_id, published_at DESC);

-- Download count snapshots for trend charts
CREATE TABLE download_snapshots (
  extension_id    TEXT NOT NULL REFERENCES extensions(id) ON DELETE CASCADE,
  download_count  INTEGER NOT NULL,
  snapshot_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_snapshots_ext_time ON download_snapshots(extension_id, snapshot_at DESC);
```

### 10.2 Algolia Index

**Index name:** `extensions`

```typescript
// Document shape pushed to Algolia
interface AlgoliaExtension {
  objectID: string;          // Extension id (Algolia primary key)
  name: string;
  description: string | null;
  authors: string[];         // Names only (emails stripped)
  provides: string[];        // ["languages", "grammars", "language-servers"]
  download_count: number;
  github_stars: number;
  github_license: string | null;
  published_at_timestamp: number;  // Unix timestamp for sorting
  github_pushed_at_timestamp: number | null;
  version: string;
}
```

**Index settings:**

```typescript
{
  searchableAttributes: ["name", "objectID", "description", "authors"],
  attributesForFaceting: ["searchable(provides)", "searchable(github_license)"],
  customRanking: ["desc(download_count)", "desc(github_stars)"],
  typoTolerance: true,
  minWordSizefor1Typo: 4,
  minWordSizefor2Typos: 8,
  hitsPerPage: 24,
  paginationLimitedTo: 1000
}
```

### 10.3 Search Fallback (Zed API)

When Algolia is unavailable, the client falls back to:

```
GET https://api.zed.dev/extensions?filter={query}&max_schema_version=1
```

This returns up to 1000 results. No typo tolerance, no faceted counts, no custom sorting — but search still works. The UI hides facet counts and shows a simplified result list.

---

## 11. Sync Pipeline

The sync pipeline is a standalone script (`scripts/sync.ts`) that runs on the same machine as the SvelteKit app. It writes to SQLite and pushes to Algolia.

### 11.1 Zed API Sync (Every 6 hours)

```
1. Fetch extensions.toml from GitHub raw URL → parse for complete extension ID list
2. Fetch GET api.zed.dev/extensions?max_schema_version=1 → up to 1000 extensions
3. For IDs in extensions.toml but NOT in API response:
   Fetch GET api.zed.dev/extensions/{id} individually (rate: 10 req/sec)
4. For each extension:
   UPSERT into `extensions` table
   INSERT into `download_snapshots`
   Extract github_owner/github_repo from repository URL
5. Push all extensions to Algolia index
```

### 11.2 GitHub Metadata Sync (Daily)

```
1. Query extensions ordered by github_synced_at ASC NULLS FIRST
2. For each extension (rate: ~1.3 req/sec to stay within 5000/hr):
   a. GET /repos/{owner}/{repo} → stars, forks, license, pushed_at, topics
   b. UPDATE extensions SET github_stars=..., github_synced_at=NOW()
3. Push updated star counts to Algolia index
```

READMEs are **not** fetched during sync. They are fetched on-demand when a user visits a detail page (see section 12.4).

### 11.3 Version Backfill (Lazy + Background)

- **On-demand:** When a user visits `/extensions/:id` and no versions exist in DB, fetch from Zed API on the fly in the server `load()` function, populate the table, and return
- **Background:** Low-priority cron (every 12h) backfills 100 extensions per run that have 0 version rows

### 11.4 Edge Cases

| Case | Handling |
|------|----------|
| Extension repo returns 404 | Sync: mark `github_synced_at`, set metadata to null, skip for 7 days. Detail page: show description only |
| Repo is `zed-industries/zed` (monorepo) | Skip README fetch (it's for Zed itself), flag in UI as "core extension" |
| GitHub rate limit exhausted | Sync: checkpoint progress, resume on next run. Detail page: show description only, retry on next visit |
| README > 100KB | Truncate at 100KB, show "View full README on GitHub" link |
| Extension removed from registry | Keep in DB but mark as unlisted |
| README fetch timeout | Show description with "README unavailable" message and link to repo |

---

## 12. Frontend (SvelteKit)

### 12.1 Route Structure

```
src/routes/
├── +layout.svelte              # Header, slot, Footer
├── +layout.server.ts           # Load global stats from SQLite
├── +page.svelte                # Browse / Search page (/)
├── +page.server.ts             # SSR: initial page load with top extensions from SQLite
└── extensions/
    └── [id]/
        ├── +page.svelte        # Extension detail page
        └── +page.server.ts     # SSR: load full detail from SQLite
```

### 12.2 Component Inventory

```
src/lib/components/
├── Header.svelte               # Site header with search bar
├── Footer.svelte               # Site footer
├── SearchBar.svelte            # Algolia InstantSearch, debounced, URL state sync
├── CategoryTabs.svelte         # Horizontal tabs with facet counts from Algolia
├── SortSelect.svelte           # Sort dropdown
├── ExtensionCard.svelte        # Card: name, desc, downloads, stars, tags
├── Pagination.svelte           # Page navigation
├── ProvideTag.svelte           # Colored pill for provides value
├── Sidebar.svelte              # Detail page: stats, authors, links
├── VersionHistory.svelte       # Scrollable version list
├── ReadmeRenderer.svelte       # Styled HTML container (GitHub-flavored CSS)
├── DownloadChart.svelte        # SVG sparkline for download trend
├── InstallButton.svelte        # "Install in Zed" deep link button
└── SEOHead.svelte              # Meta tags, OG tags
```

### 12.3 Browse / Search Page (`/`)

**URL state:** `/?q=python&category=language-servers&sort=stars&page=2`

**Search flow:**
1. **Initial SSR load** (`+page.server.ts`): query SQLite for top extensions by downloads, grouped by category for facet counts. This gives a fast server-rendered page with content for SEO.
2. **Client-side search** (after hydration): Algolia lite client handles search directly from the browser. No server roundtrip. Typing in the search bar queries Algolia instantly with typo tolerance and faceted results.
3. **Fallback**: If Algolia fails (network error, blocked), fall back to Zed API `?filter=` parameter. UI gracefully degrades — no facet counts, basic results.

**UI elements:**
- Search bar — debounced (300ms), updates URL via `goto()` with `replaceState`
- Category tabs — horizontal scroll, facet counts from Algolia response
- Sort dropdown — downloads (default), recently updated, name, stars
- Extension grid — responsive: 1 col mobile, 2 col tablet, 3-4 col desktop
- Pagination at bottom

### 12.4 Extension Detail Page (`/extensions/[id]`)

**Data flow:**
1. `+page.server.ts` reads extension metadata + versions + download snapshots from SQLite (< 1ms)
2. Fetches README from GitHub API on-demand:
   - Check in-memory cache (Map with 24h TTL) → hit: use cached rendered HTML
   - Cache miss: `GET /repos/{owner}/{repo}/readme` → decode base64 → rewrite image URLs → render with marked + shiki → sanitize with DOMPurify → cache rendered HTML
   - If GitHub returns 404 or rate-limited: show description text only, no README
3. Return everything to the page component

**Two-column layout (70/30 split):**

**Main column:**
1. Extension name (h1), version badge, provides tags
2. Action buttons: "Install in Zed" (primary), "Visit Repository" (secondary)
3. README rendered HTML with:
   - GitHub-flavored markdown CSS
   - Syntax highlighting via shiki (server-side)
   - Relative image URLs rewritten to `raw.githubusercontent.com`
4. Fallback: show description if no README

**Sidebar:**
1. Download count (formatted: "4.7M")
2. GitHub stars / forks / open issues
3. License badge
4. Last updated (relative + absolute)
5. Authors list (names parsed, emails stripped)
6. Repository link
7. Version history (scrollable, all versions with dates)
8. Download trend sparkline (last 30 days)

### 12.5 Caching Strategy

| Layer | TTL | Implementation |
|-------|-----|----------------|
| **SQLite reads** | Real-time | No cache needed — reads are <1ms for ~1,600 rows |
| **README HTML** | 24 hours | In-memory Map keyed by extension ID. Fetched on-demand from GitHub, rendered once, cached. ~50-100 entries in memory at any time |
| **SvelteKit HTTP headers** | `s-maxage=300, stale-while-revalidate=600` (browse) / `s-maxage=600, stale-while-revalidate=3600` (detail) | Set in `+page.server.ts` via `setHeaders` |
| **CDN edge** | Respects Cache-Control | Fly.io edge or Cloudflare in front |

---

## 13. Markdown Rendering Pipeline

README rendering is the core differentiator. Fetched on-demand, rendered server-side, cached in memory.

```
User visits /extensions/catppuccin
  │
  ▼
Check in-memory cache (Map<extensionId, { html, expiry }>)
  │
  ├── Cache hit → return cached HTML
  │
  └── Cache miss:
        │
        ▼
      GET github.com/repos/{owner}/{repo}/readme → base64 markdown
        │
        ▼
      Rewrite relative image URLs → absolute raw.githubusercontent.com URLs
        │
        ▼
      Parse with `marked` → HTML
        │
        ▼
      Syntax highlight code blocks with `shiki` (server-side only)
        │
        ▼
      Sanitize with `DOMPurify` (remove XSS vectors, keep safe HTML)
        │
        ▼
      Store in cache (TTL: 24 hours) → return HTML
```

**Image URL rewriting:**
```
![screenshot](./assets/preview.png)
  → ![screenshot](https://raw.githubusercontent.com/{owner}/{repo}/{branch}/assets/preview.png)

<img src="docs/image.png">
  → <img src="https://raw.githubusercontent.com/{owner}/{repo}/{branch}/docs/image.png">
```

---

## 14. Project Structure

```
zedext/
├── src/
│   ├── app.html
│   ├── app.css                     # Tailwind v4 entry
│   ├── lib/
│   │   ├── server/
│   │   │   ├── db.ts               # SQLite connection (better-sqlite3)
│   │   │   ├── readme.ts           # On-demand README fetch, render, cache (24h TTL)
│   │   │   ├── markdown.ts         # Render markdown → HTML with image rewrite + shiki
│   │   │   ├── parse-author.ts     # "Name <email>" → { name, email }
│   │   │   └── parse-repo-url.ts   # GitHub URL → { owner, repo }
│   │   ├── components/             # 14 Svelte components (see 12.2)
│   │   ├── stores/
│   │   │   └── search.ts           # Algolia search state
│   │   ├── utils/
│   │   │   ├── format.ts           # formatNumber, formatDate, timeAgo
│   │   │   └── constants.ts        # CATEGORIES, SORT_OPTIONS
│   │   └── types.ts                # All TypeScript interfaces
│   └── routes/                     # See section 12.1
├── scripts/
│   ├── sync.ts                     # Main sync entry point (runs all steps)
│   ├── sync-zed.ts                 # Zed API → SQLite (extensions + versions)
│   ├── sync-github.ts              # GitHub API → SQLite (stars, license, forks — no READMEs)
│   └── sync-algolia.ts             # SQLite → Algolia index
├── data/
│   └── zedext.db                   # SQLite database file (gitignored)
├── static/
│   └── favicon.ico
├── svelte.config.js
├── vite.config.ts
├── package.json
├── .env.example
├── DESIGN.md
└── README.md
```

No monorepo. No `apps/` or `packages/`. One flat SvelteKit project with a `scripts/` folder for the sync pipeline.

---

## 15. Environment Variables

```bash
# GitHub (server-only, used by sync script)
GITHUB_TOKEN=ghp_...

# Algolia (public keys are safe to expose to client)
PUBLIC_ALGOLIA_APP_ID=XXXXXXXXXX
PUBLIC_ALGOLIA_SEARCH_KEY=xxxxxxxxxxxx  # Search-only key (read-only, safe for client)
ALGOLIA_ADMIN_KEY=xxxxxxxxxxxx          # Write key (server-only, used by sync script)

# App
PUBLIC_SITE_URL=https://zedext.dev
DATABASE_PATH=./data/zedext.db          # SQLite file path
```

Only 5 environment variables. The Algolia search key is intentionally public (it's a read-only key, same as how npmx.dev exposes theirs).

---

## 16. Implementation Phases

### Phase 0: Scaffolding

- [x] Design document
- [ ] Scaffold SvelteKit app with Tailwind CSS v4
- [ ] Set up SQLite with better-sqlite3 and initial schema
- [ ] Create Algolia account + index
- [ ] Create `.env.example`
- [ ] Define TypeScript types (`src/lib/types.ts`)

### Phase 1: Data Pipeline

- [ ] `scripts/sync-zed.ts` — Zed API → SQLite
- [ ] `scripts/sync-github.ts` — GitHub metadata (stars, license, forks) → SQLite (no READMEs)
- [ ] `scripts/sync-algolia.ts` — SQLite → Algolia index
- [ ] `scripts/sync.ts` — orchestrator (runs all three in sequence)
- [ ] `src/lib/server/db.ts` — SQLite connection helper
- [ ] `src/lib/server/parse-repo-url.ts`, `parse-author.ts` — utility functions
- [ ] Run first sync, verify all ~1,600 extensions in SQLite + Algolia

### Phase 2: Frontend — Browse Page

- [ ] `src/lib/utils/format.ts` — number/date formatting
- [ ] `src/lib/utils/constants.ts` — categories, sort options
- [ ] Layout: `Header.svelte`, `Footer.svelte`, `+layout.svelte`
- [ ] `SearchBar.svelte` — Algolia client-side search with fallback
- [ ] `CategoryTabs.svelte` — facet counts from Algolia
- [ ] `SortSelect.svelte`, `ProvideTag.svelte`, `ExtensionCard.svelte`, `Pagination.svelte`
- [ ] `+page.server.ts` + `+page.svelte` — wire browse page
- [ ] Test: search, filter, sort, paginate, URL state, Algolia fallback to Zed API

### Phase 3: Frontend — Detail Page

- [ ] `src/lib/server/readme.ts` — on-demand GitHub README fetch + 24h cache
- [ ] `src/lib/server/markdown.ts` — render with image rewrite + shiki
- [ ] `ReadmeRenderer.svelte` — GitHub-flavored markdown CSS
- [ ] `Sidebar.svelte` — stats, authors, links
- [ ] `VersionHistory.svelte` — scrollable version list
- [ ] `DownloadChart.svelte` — SVG sparkline
- [ ] `InstallButton.svelte` — `zed://extensions/{id}` deep link
- [ ] `SEOHead.svelte` — meta/OG tags
- [ ] `extensions/[id]/+page.server.ts` + `+page.svelte`
- [ ] Test: README rendering, sidebar data, version list, on-demand version backfill

### Phase 4: Polish & Deploy

- [ ] Full GitHub metadata sync (run overnight for all extensions)
- [ ] Set up cron (`crontab` or GitHub Actions scheduled workflow)
- [ ] Loading states, error states, empty states
- [ ] Responsive design pass (mobile, tablet, desktop)
- [ ] SEO: sitemap.xml, robots.txt
- [ ] Deploy SvelteKit to Fly.io with persistent volume for SQLite
- [ ] Verify cron runs in production

### Future Phases

- [ ] User ratings/reviews (requires auth)
- [ ] Extension comparison view (side-by-side)
- [ ] Dynamic OG image generation per extension
- [ ] Code browser (view extension source via GitHub API tree)
- [ ] Curated collections ("Best Themes", "Essential Language Support")

---

## 17. Verification & Testing

### Manual Testing Checklist

1. **Sync:** Run `pnpm sync`, verify all ~1,600 extensions in SQLite and Algolia
2. **Search:** Type "pythn" (typo) in search bar, verify "Python" appears (Algolia typo tolerance)
3. **Facets:** Click "Themes" tab, verify count matches and only themes shown
4. **Fallback:** Block Algolia in browser DevTools, verify Zed API fallback kicks in
5. **Detail page:** Visit `/extensions/catppuccin`, verify README renders with images, sidebar shows stars/license
6. **Version history:** Verify all versions listed with correct dates
7. **Deep link:** Click "Install in Zed" button, verify `zed://extensions/catppuccin` opens Zed
8. **Responsive:** Test at 375px, 768px, 1280px widths
9. **SEO:** Check `<title>`, `<meta description>`, OG tags on both page types
10. **Edge cases:** Extension with no README, no repo URL, repo returning 404, monorepo extension (`zed-industries/zed`)

### Automated Testing (Future)

- **Unit tests** (Vitest): parse-repo-url, parse-author, format utils, markdown image rewriting
- **Integration tests**: sync pipeline against mock API responses
- **E2E tests** (Playwright): search flow, detail page, responsive layout

---

## 18. Security & Privacy

### Data We Store

We store only **publicly available data**: extension metadata from the Zed API, README content and repository statistics from public GitHub repos. No user data, no PII, no cookies, no analytics tracking in v1.

### Secrets Management

| Secret | Stored In | Scope |
|--------|-----------|-------|
| `GITHUB_TOKEN` | Environment variable | Server + sync script only. Read-only GitHub API access (PAT with `public_repo` scope) |
| `ALGOLIA_ADMIN_KEY` | Environment variable | Sync script only. Write access to Algolia index |
| `PUBLIC_ALGOLIA_SEARCH_KEY` | Exposed to client | **Intentionally public.** Read-only search key. This is the standard Algolia pattern (npmx.dev does the same) |

The SQLite file contains only public data. If leaked, there is no security impact.

### Attack Surface

| Vector | Risk | Mitigation |
|--------|------|------------|
| **README XSS** | Malicious README injects JavaScript via rendered HTML | Sanitize with DOMPurify; strict allowlist of tags/attributes |
| **GitHub API token leak** | Token in logs or error messages | Never log request headers; environment variables only |
| **Algolia admin key leak** | Attacker could modify search index | Only used in sync script; never in SvelteKit app |
| **SQLite file access** | Direct download of DB file | Not served by SvelteKit; stored outside `static/` directory |

### README Sanitization

READMEs are user-generated content from thousands of GitHub repos. The rendering pipeline **must** sanitize output:

- DOMPurify strips `<script>`, `<iframe>`, `onclick` handlers, `javascript:` URLs
- Images allowed only from `https://` origins
- Links open in new tab with `rel="noopener noreferrer"`

---

## 19. Service Level Objectives

| Metric | Target | How Measured |
|--------|--------|--------------|
| **Browse page load (SSR)** | < 200ms (p95) | SvelteKit server response time (SQLite reads are <1ms) |
| **Detail page load (SSR)** | < 300ms cache hit, < 1.5s cache miss (p95) | Cache miss includes GitHub API fetch + markdown rendering. After first visit, cached for 24h |
| **Search latency** | < 50ms (p95) | Algolia query time (measured client-side) |
| **Data freshness — Zed API** | < 6 hours stale | Cron every 6h; `zed_api_synced_at` column |
| **Data freshness — GitHub** | < 24 hours stale | Cron daily; `github_synced_at` column |
| **Uptime** | 99.5% | Fly.io status + uptimerobot |
| **Extension coverage** | 100% of registered | DB count vs `extensions.toml` count |

---

## 20. Alternatives Considered

### Database

| Option | Decision |
|--------|----------|
| **No database (SWR only)** | Rejected: Zed API lacks README/stars; GitHub enrichment is rate-limited. On-demand would exhaust quotas |
| **Supabase (PostgreSQL)** | Rejected: network latency, operational overhead, and cost for a ~1,600 row dataset that's entirely read-heavy. Overengineered |
| **SQLite (local file)** | **Chosen**: zero latency, free, <1ms reads, WAL mode handles concurrent reads during cron writes. Perfect for this scale |

### Search

| Option | Decision |
|--------|----------|
| **SQLite FTS5** | Rejected: no typo tolerance — the main complaint about Zed's current search |
| **Meilisearch** | Rejected: requires hosting another service. Good but adds infrastructure |
| **Algolia (free tier)** | **Chosen**: client-side search (no server involved), typo-tolerant, faceted, same pattern as npmx.dev. 10K records + 10K searches/month free tier covers us |

### Search Fallback

| Option | Decision |
|--------|----------|
| **No fallback** | Rejected: single point of failure on Algolia |
| **SQLite FTS5 as fallback** | Considered: would require a server route for search. Adds complexity |
| **Zed API `?filter=`** | **Chosen**: zero infrastructure, already exists, graceful degradation. Loses typo tolerance and facets but search still works |

### Architecture

| Option | Decision |
|--------|----------|
| **SvelteKit + Hono backend + Supabase + Meilisearch** | Rejected: 4 services, 3 network hops. Massively overengineered for ~1,600 extensions |
| **SvelteKit + SQLite + Algolia** | **Chosen**: 1 app, 1 local DB file, 1 search service. Proportional to the problem |

---

## 21. Open Questions

1. **Domain name:** Is `zedext.dev` available? Alternatives: `zedmarket.dev`, `zedpkg.dev`, `zextensions.dev`.

2. **GitHub token strategy:** Personal access token or GitHub App? A GitHub App gets a higher rate limit (5000/hr per installation vs per user) and looks more professional.

3. **Monorepo extensions (`zed-industries/zed`):** Some extensions like `html` have their repository set to the main Zed repo. Skip GitHub metadata entirely, or display with a disclaimer?

4. **Legal/licensing:** We're displaying README content from other people's repos. A simple attribution footer is likely sufficient, but worth confirming.

5. **Fly.io vs Railway:** Both support persistent volumes for SQLite. Fly.io has better edge network; Railway has simpler DX. Either works.

6. **Algolia free tier limits:** 10K searches/month might be tight if the site gains traction. Monitor usage and consider upgrading or adding SQLite FTS5 as a server-side alternative before hitting the limit.

7. **Notification to Zed team:** Should we reach out before launching? They might appreciate it, or they might see it as fragmenting their ecosystem.
