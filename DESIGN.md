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
8. **Low operating cost:** Target < $20/month total infrastructure (Supabase free tier, Meilisearch Cloud free tier, Railway/Vercel free or hobby tiers).
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

A user opens ZedExt and sees the browse page with ~1,600 extensions. They click the "Themes" category tab, which filters to 589 results. They sort by "Stars" to see the most popular. They click "Catppuccin" and land on a detail page showing the full README with preview screenshots of all four color variants, 755 GitHub stars, MIT license, and version history showing 22 releases. They click "Install in Zed" which opens `zed://extensions/catppuccin` in their editor.

### Scenario B: Searching for language support

A developer needs Elixir support for Zed. They type "elxir" (typo) in the search bar. Meilisearch's typo tolerance still returns "Elixir" as the top result. The card shows it provides language support + language server + grammars, has 45k downloads, and was updated 2 weeks ago. They click through to the detail page, read the README to confirm it supports HEEx templates, and install it.

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
| **No traditional DB** | All data sourced from npm registry + GitHub + Algolia at request time, cached aggressively with SWR | We use Supabase (Postgres) as a cache/enrichment layer because Zed's API is limited and GitHub enrichment is rate-limited |
| **Multi-layer caching** | Fetch cache (SWR) → Payload cache (ISR) → Route-level ISR → Redis | We use server-side LRU cache → SvelteKit HTTP caching → CDN edge caching |
| **Search** | Algolia (client-side, lite client 13KB) with npm API fallback | Meilisearch (server-proxied) — similar typo-tolerance and faceted filtering, self-hosted |
| **Server API routes** | 38 Nitro API routes aggregate/transform external data | Hono backend with focused routes for search proxy and extension detail |
| **Styling** | UnoCSS with CSS variable theme system (light/dark) | Tailwind CSS v4 with CSS variable theme system |
| **OG images** | Runtime generation via nuxt-og-image | Future: dynamic OG image generation per extension |
| **README rendering** | marked + sanitize-html, server-rendered | marked + DOMPurify + shiki, server-rendered with image URL rewriting |
| **Caching external APIs** | `event.waitUntil()` for background SWR revalidation | Cron-based sync pipeline (every 6h) pre-populates database |

### VS Code Marketplace (UX Reference)

- Tabbed detail pages (Overview, Version History, Q&A, Ratings)
- Rich metadata sidebar (categories, resources, project details, compatibility)
- Star ratings and review counts
- Screenshot carousel

### Key Difference: Pre-Computed vs On-Demand

npmx.dev fetches everything on-demand because npm's API is comprehensive and fast. Zed's API is minimal (no README, no stars, no license) — we must enrich data from GitHub, which is rate-limited (5000 req/hr). Therefore we **pre-compute and store** enriched data via a sync pipeline rather than fetching on every request.

---

## 7. Architecture Overview

```
                                    ┌─────────────────────┐
                                    │    Meilisearch       │
                                    │  (search index)      │
                                    └──────────┬──────────┘
                                               │
┌──────────────┐    ┌──────────────────────────┐│   ┌──────────────┐
│  Zed API     │───▶│    Hono/Bun Backend      │├──▶│  Supabase    │
│              │    │                          ││   │  (Postgres)  │
│  GitHub API  │───▶│  - Sync pipeline (cron)  │◀──▶│              │
│              │    │  - Public API routes      │    │  - extensions│
└──────────────┘    │  - Search proxy          │    │  - versions  │
                    └──────────┬───────────────┘    │  - readmes   │
                               │                    │  - snapshots │
                    ┌──────────▼───────────────┐    └──────────────┘
                    │    SvelteKit Frontend     │
                    │                          │
                    │  - Browse / Search page   │
                    │  - Extension detail page  │
                    │  - SSR + client hydration │
                    └──────────────────────────┘
```

### Component Responsibilities

| Component | Role | Deployment |
|-----------|------|------------|
| **SvelteKit App** (`apps/web`) | Server-rendered UI, SEO, client interactivity | Vercel / Cloudflare Pages |
| **Hono Backend** (`apps/server`) | Data sync pipeline, API for frontend, search proxy | Railway / Fly.io |
| **Supabase** | Persistent storage for enriched extension data | Supabase Cloud |
| **Meilisearch** | Typo-tolerant full-text search with faceted filtering | Meilisearch Cloud / Railway |

---

## 8. Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Frontend framework** | SvelteKit + TypeScript | SSR for SEO, lighter than Nuxt/Next, excellent DX |
| **Styling** | Tailwind CSS v4 | CSS-first config, fast iteration, v4 uses CSS variables natively |
| **Backend framework** | Hono on Bun | Lightweight, fast, runs cron natively, great TypeScript support |
| **Database** | Supabase (PostgreSQL) | Managed Postgres, generous free tier, built-in auth for future features |
| **Search engine** | Meilisearch | Typo-tolerant, faceted filtering, instant results, self-hostable |
| **Markdown rendering** | marked + DOMPurify + shiki | Fast parsing, safe HTML output, syntax highlighting |
| **Package manager** | pnpm | Fast, disk-efficient, native workspace support |
| **Monorepo** | pnpm workspaces | Simple, no extra tooling (no Turborepo needed at this scale) |

---

## 9. Data Sources

### 9.1 Zed Extension API (`api.zed.dev`)

| Endpoint | Method | Description | Rate Limit |
|----------|--------|-------------|------------|
| `/extensions?max_schema_version=1` | GET | List up to 1000 extensions sorted by downloads | Unknown (generous) |
| `/extensions/:id` | GET | All published versions of an extension | Unknown |

**Response fields per extension:**

```typescript
interface ZedExtension {
  id: string;              // "html"
  name: string;            // "HTML"
  version: string;         // "0.3.1"
  description: string | null;
  authors: string[];       // ["Isaac Clayton <slightknack@gmail.com>"]
  repository: string;      // "https://github.com/zed-extensions/toml"
  schema_version: number;  // 1
  wasm_api_version: string | null;  // "0.7.0"
  provides: ProvideKind[]; // ["languages", "grammars", "language-servers"]
  published_at: string;    // ISO 8601
  download_count: number;  // 4686196
}
```

**`provides` values:** `themes`, `icon-themes`, `languages`, `grammars`, `language-servers`, `context-servers`, `agent-servers`, `slash-commands`, `indexed-docs-providers`, `snippets`, `debug-adapters`

**Limitations:**
- Maximum 1000 results (no pagination), but ~1600+ extensions exist
- No README, license, stars, or any GitHub-derived metadata
- No historical download data (only current count)
- `description` is typically one sentence

### 9.2 Extensions Registry (`github.com/zed-industries/extensions`)

- **`extensions.toml`** — Complete list of ALL registered extensions (bypasses the 1000 API cap)
- **`.gitmodules`** — Maps extension submodule paths to source Git repository URLs
- **Individual `extension.toml`** files — Richer metadata: grammar references, language server declarations, capabilities

### 9.3 GitHub API (via `repository` URL per extension)

| Endpoint | Data | Cache Strategy |
|----------|------|----------------|
| `GET /repos/{owner}/{repo}` | Stars, forks, issues, license, pushed_at, topics | Refresh daily |
| `GET /repos/{owner}/{repo}/readme` | README markdown content | Conditional (ETag), refresh daily |

**Rate limit:** 5000 requests/hour with authenticated token. With ~1600 extensions needing 2 requests each = ~3200 requests per full sync — comfortably within limits.

---

## 10. Data Model

### 10.1 Database Schema

#### `extensions` — Primary table (one row per extension, latest version data)

```sql
CREATE TABLE extensions (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  version         TEXT NOT NULL,
  description     TEXT,
  authors         TEXT[] NOT NULL DEFAULT '{}',
  repository      TEXT,
  schema_version  INTEGER NOT NULL DEFAULT 1,
  wasm_api_version TEXT,
  provides        TEXT[] NOT NULL DEFAULT '{}',
  published_at    TIMESTAMPTZ NOT NULL,
  download_count  INTEGER NOT NULL DEFAULT 0,

  -- Denormalized GitHub metadata (avoids JOINs on listing pages)
  github_stars       INTEGER DEFAULT 0,
  github_forks       INTEGER DEFAULT 0,
  github_open_issues INTEGER DEFAULT 0,
  github_license     TEXT,
  github_pushed_at   TIMESTAMPTZ,
  github_topics      TEXT[] DEFAULT '{}',
  github_default_branch TEXT DEFAULT 'main',
  github_owner       TEXT,
  github_repo        TEXT,

  -- Sync tracking
  zed_api_synced_at  TIMESTAMPTZ,
  github_synced_at   TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_extensions_downloads ON extensions(download_count DESC);
CREATE INDEX idx_extensions_published ON extensions(published_at DESC);
CREATE INDEX idx_extensions_stars ON extensions(github_stars DESC);
CREATE INDEX idx_extensions_provides ON extensions USING GIN(provides);
```

#### `extension_versions` — Full version history per extension

```sql
CREATE TABLE extension_versions (
  id            SERIAL PRIMARY KEY,
  extension_id  TEXT NOT NULL REFERENCES extensions(id) ON DELETE CASCADE,
  version       TEXT NOT NULL,
  published_at  TIMESTAMPTZ NOT NULL,
  UNIQUE(extension_id, version)
);

CREATE INDEX idx_versions_ext ON extension_versions(extension_id, published_at DESC);
```

#### `github_readmes` — Stored separately (large text, only needed on detail pages)

```sql
CREATE TABLE github_readmes (
  extension_id      TEXT PRIMARY KEY REFERENCES extensions(id) ON DELETE CASCADE,
  content_markdown  TEXT,
  etag              TEXT,           -- GitHub ETag for conditional requests
  fetched_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### `download_snapshots` — For trend charts

```sql
CREATE TABLE download_snapshots (
  id              SERIAL PRIMARY KEY,
  extension_id    TEXT NOT NULL REFERENCES extensions(id) ON DELETE CASCADE,
  download_count  INTEGER NOT NULL,
  snapshot_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_snapshots_ext_time ON download_snapshots(extension_id, snapshot_at DESC);
```

### 10.2 Meilisearch Index

**Index name:** `extensions`

```typescript
// Document shape pushed to Meilisearch
interface MeilisearchExtension {
  id: string;
  name: string;
  description: string | null;
  authors: string[];        // Names only (emails stripped)
  provides: ProvideKind[];
  download_count: number;
  github_stars: number;
  github_license: string | null;
  published_at: number;     // Unix timestamp
  github_pushed_at: number | null;
  version: string;
}
```

**Index settings:**

```typescript
{
  searchableAttributes: ["name", "id", "description", "authors"],
  filterableAttributes: ["provides", "github_license"],
  sortableAttributes: ["download_count", "github_stars", "published_at", "github_pushed_at", "name"],
  rankingRules: ["words", "typo", "proximity", "attribute", "sort", "exactness", "download_count:desc"],
  typoTolerance: { minWordSizeForTypos: { oneTypo: 4, twoTypos: 8 } },
  faceting: { maxValuesPerFacet: 20 },
  pagination: { maxTotalHits: 5000 }
}
```

---

## 11. Sync Pipeline

The sync pipeline is the backbone of the project. It runs as scheduled jobs inside the Hono backend.

### 11.1 Zed API Sync (Every 6 hours)

```
1. Fetch extensions.toml from GitHub raw URL → parse to get ALL extension IDs
2. Fetch GET api.zed.dev/extensions?max_schema_version=1 → up to 1000 extensions
3. For IDs in extensions.toml but NOT in API response:
   Fetch GET api.zed.dev/extensions/{id} individually (rate: 10 req/sec)
4. For each extension:
   UPSERT into `extensions` table
   INSERT into `download_snapshots` (current download_count)
   Extract github_owner/github_repo from repository URL
5. Push all extensions to Meilisearch index
```

### 11.2 GitHub Metadata Sync (Daily)

```
1. Query extensions ordered by github_synced_at ASC NULLS FIRST
2. For each extension (rate: ~1.3 req/sec to stay within 5000/hr):
   a. GET /repos/{owner}/{repo} → stars, forks, license, pushed_at, topics
   b. GET /repos/{owner}/{repo}/readme (with If-None-Match: stored ETag)
      → If 200: store markdown + new ETag
      → If 304: skip (unchanged)
   c. UPDATE extensions + UPSERT github_readmes
3. Update Meilisearch index with new star counts
```

### 11.3 Version Backfill (Lazy + Background)

- **On-demand:** When a user visits `/extensions/:id` and no versions exist in DB, fetch from Zed API on the fly
- **Background:** Low-priority cron (every 12h) backfills 100 extensions per run that have 0 version rows

### 11.4 Edge Cases

| Case | Handling |
|------|----------|
| Extension repo returns 404 | Mark `github_synced_at`, set metadata to null, skip for 7 days |
| Repo is `zed-industries/zed` (monorepo) | Skip README (it's for Zed itself), flag in UI as "core extension" |
| GitHub rate limit exhausted | Checkpoint progress, resume on next run |
| README > 100KB | Truncate, show "View full README on GitHub" link |
| Extension removed from registry | Keep in DB but mark as unlisted (future: soft delete) |

---

## 12. Backend API (Hono)

### 12.1 Public Routes

| Method | Path | Description | Cache |
|--------|------|-------------|-------|
| `GET` | `/api/search` | Search via Meilisearch proxy | 2 min |
| `GET` | `/api/extensions/:id` | Full detail + README + versions + trend | 10 min |
| `GET` | `/api/stats` | Total extensions, downloads, last sync time | 5 min |
| `GET` | `/api/health` | Health check | none |

### 12.2 Search Query Parameters

```
GET /api/search?q=python&category=language-servers&sort=stars&page=2&limit=24
```

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `q` | string | `""` | Search query |
| `category` | string | `"all"` | Filter by provides value |
| `sort` | `"downloads" \| "updated" \| "name" \| "stars"` | `"downloads"` | Sort field |
| `page` | number | `1` | Page number |
| `limit` | number | `24` | Results per page (max 100) |

**Response includes facet counts** for category tabs:
```json
{
  "hits": [...],
  "totalHits": 1647,
  "page": 1,
  "totalPages": 69,
  "processingTimeMs": 3,
  "facets": {
    "provides": {
      "themes": 589,
      "languages": 312,
      "language-servers": 287,
      ...
    }
  }
}
```

### 12.3 Extension Detail Response

```typescript
interface ExtensionDetailResponse {
  extension: Extension;           // Full row from extensions table
  readme_html: string | null;     // Rendered HTML (image URLs rewritten)
  versions: ExtensionVersion[];   // All versions, newest first
  download_trend: { date: string; count: number }[];  // Last 30 days
}
```

### 12.4 Internal Routes (API key protected)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/sync/zed` | Trigger Zed API sync |
| `POST` | `/api/sync/github` | Trigger GitHub metadata sync |
| `GET` | `/api/sync/status` | Last sync run info |

---

## 13. Frontend (SvelteKit)

### 13.1 Route Structure

```
apps/web/src/routes/
├── +layout.svelte              # Header, slot, Footer
├── +layout.server.ts           # Load global stats
├── +page.svelte                # Browse / Search page (/)
├── +page.server.ts             # SSR: search with URL params
└── extensions/
    └── [id]/
        ├── +page.svelte        # Extension detail page
        └── +page.server.ts     # SSR: load full detail
```

### 13.2 Component Inventory

```
apps/web/src/lib/components/
├── Header.svelte               # Site header with search bar
├── Footer.svelte               # Site footer
├── SearchBar.svelte            # Debounced search input (300ms)
├── CategoryTabs.svelte         # Horizontal tabs with facet counts
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

### 13.3 Browse / Search Page (`/`)

**URL state:** `/?q=python&category=language-servers&sort=stars&page=2`

- Search bar at top — debounced, updates URL via `goto()` with `replaceState`
- Category tabs — horizontal scroll, shows facet counts from Meilisearch
- Sort dropdown — downloads (default), recently updated, name, stars
- Extension grid — responsive: 1 col mobile, 2 col tablet, 3-4 col desktop
- Pagination at bottom

**Data flow:**
1. `+page.server.ts` reads `url.searchParams`, fetches `/api/search`
2. Returns `{ extensions, totalHits, totalPages, facets }` to page
3. Client-side navigation updates URL params, triggers server load

### 13.4 Extension Detail Page (`/extensions/[id]`)

**Two-column layout (70/30 split):**

**Main column:**
1. Extension name (h1), version badge, provides tags
2. Action buttons: "Install in Zed" (primary), "Visit Repository" (secondary)
3. README rendered HTML in a styled container with:
   - GitHub-flavored markdown CSS (headings, code blocks, tables, images, blockquotes)
   - Syntax highlighting via shiki (applied server-side)
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

### 13.5 Caching Strategy (following npmx.dev patterns)

| Layer | TTL | Implementation |
|-------|-----|----------------|
| **Hono in-memory LRU** | 2-10 min | `Map` with TTL eviction in the backend |
| **SvelteKit HTTP headers** | `s-maxage=120, stale-while-revalidate=300` (browse) / `s-maxage=600, stale-while-revalidate=3600` (detail) | Set in `+page.server.ts` via `setHeaders` |
| **CDN edge** | Respects Cache-Control | Vercel/Cloudflare edge network |

---

## 14. Markdown Rendering Pipeline

README rendering is the core differentiator. Pipeline:

```
GitHub README (raw markdown)
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
Cache rendered HTML in Hono LRU (TTL: 10 min)
  │
  ▼
Serve to SvelteKit, render inside <ReadmeRenderer> with GitHub-flavored CSS
```

**Image URL rewriting:**
```
![screenshot](./assets/preview.png)
  → ![screenshot](https://raw.githubusercontent.com/{owner}/{repo}/{branch}/assets/preview.png)

<img src="docs/image.png">
  → <img src="https://raw.githubusercontent.com/{owner}/{repo}/{branch}/docs/image.png">
```

---

## 15. Project Structure

```
zedext/
├── apps/
│   ├── web/                          # SvelteKit frontend
│   │   ├── src/
│   │   │   ├── app.html
│   │   │   ├── app.css               # Tailwind v4 entry
│   │   │   ├── lib/
│   │   │   │   ├── api.ts            # Typed fetch wrapper for Hono backend
│   │   │   │   ├── components/       # 14 Svelte components (see 9.2)
│   │   │   │   ├── stores/
│   │   │   │   │   └── search.ts     # Search state (query, category, sort)
│   │   │   │   └── utils/
│   │   │   │       ├── format.ts     # formatNumber, formatDate, timeAgo
│   │   │   │       └── constants.ts  # CATEGORIES, SORT_OPTIONS, API_BASE
│   │   │   └── routes/              # See section 9.1
│   │   ├── static/
│   │   │   └── favicon.ico
│   │   ├── svelte.config.js
│   │   ├── vite.config.ts
│   │   ├── tailwind.css
│   │   └── package.json
│   │
│   └── server/                       # Hono/Bun backend
│       ├── src/
│       │   ├── index.ts              # Hono app entry, cron scheduling
│       │   ├── env.ts                # Zod-validated environment config
│       │   ├── routes/
│       │   │   ├── api.ts            # Public API routes
│       │   │   └── sync.ts           # Sync trigger routes (API key protected)
│       │   ├── sync/
│       │   │   ├── zed-sync.ts       # Zed API → DB sync
│       │   │   ├── github-sync.ts    # GitHub API → DB sync
│       │   │   └── meilisearch-sync.ts  # DB → Meilisearch index sync
│       │   ├── services/
│       │   │   ├── db.ts             # Supabase client
│       │   │   ├── meilisearch.ts    # Meilisearch client + index config
│       │   │   ├── github.ts         # GitHub API helpers
│       │   │   └── cache.ts          # In-memory LRU cache
│       │   └── lib/
│       │       ├── markdown.ts       # Render markdown → HTML with image rewrite + shiki
│       │       ├── parse-author.ts   # "Name <email>" → { name, email }
│       │       ├── parse-repo-url.ts # GitHub URL → { owner, repo }
│       │       └── rate-limiter.ts   # Token bucket for GitHub API
│       └── package.json
│
├── packages/
│   └── shared/                       # Shared TypeScript types
│       ├── src/
│       │   └── types.ts              # All shared interfaces (see section 6)
│       ├── tsconfig.json
│       └── package.json
│
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql    # All CREATE TABLE statements
│
├── package.json                      # Workspace root
├── pnpm-workspace.yaml
├── .env.example
├── DESIGN.md                         # This document
└── README.md
```

---

## 16. Environment Variables

```bash
# Supabase
DATABASE_URL=postgresql://...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...

# GitHub
GITHUB_TOKEN=ghp_...

# Meilisearch
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_API_KEY=masterKey

# Backend
SYNC_API_KEY=your-secret-key
PORT=3001

# Frontend
PUBLIC_API_BASE=http://localhost:3001
PUBLIC_SITE_URL=https://zedext.dev
```

---

## 17. Implementation Phases

### Phase 0: Scaffolding (Day 1)

- [x] Design document
- [ ] Initialize pnpm workspace, monorepo structure
- [ ] Scaffold SvelteKit app (`apps/web`) with Tailwind CSS v4
- [ ] Scaffold Hono/Bun app (`apps/server`)
- [ ] Create shared types package (`packages/shared`)
- [ ] Set up Supabase project, run initial migration
- [ ] Create `.env.example`, configure local dev

### Phase 1: Data Pipeline (Days 2-3)

- [ ] `packages/shared/src/types.ts` — all TypeScript interfaces
- [ ] `apps/server/src/env.ts` — environment validation
- [ ] `apps/server/src/services/db.ts` — Supabase client
- [ ] `apps/server/src/lib/parse-repo-url.ts` — extract owner/repo from GitHub URL
- [ ] `apps/server/src/lib/parse-author.ts` — parse author strings
- [ ] `apps/server/src/sync/zed-sync.ts` — Zed API sync (fetch all extensions → DB)
- [ ] Run first sync, verify all ~1600 extensions in database
- [ ] `apps/server/src/lib/rate-limiter.ts` — token bucket for GitHub
- [ ] `apps/server/src/services/github.ts` — GitHub API helpers
- [ ] `apps/server/src/sync/github-sync.ts` — GitHub metadata + README sync
- [ ] Run GitHub sync for 50 extensions, verify stars/README in DB
- [ ] `apps/server/src/services/meilisearch.ts` — client + index setup
- [ ] `apps/server/src/sync/meilisearch-sync.ts` — push to search index
- [ ] Verify search works via curl against Meilisearch

### Phase 2: Backend API (Day 4)

- [ ] `apps/server/src/index.ts` — Hono app with CORS, logging
- [ ] `apps/server/src/routes/api.ts` — public GET routes (search, detail, stats)
- [ ] `apps/server/src/routes/sync.ts` — POST sync triggers (API key protected)
- [ ] `apps/server/src/services/cache.ts` — in-memory LRU
- [ ] `apps/server/src/lib/markdown.ts` — render markdown with image rewrite + shiki
- [ ] Test all endpoints with curl

### Phase 3: Frontend — Browse Page (Days 5-6)

- [ ] `apps/web/src/lib/api.ts` — typed fetch wrapper
- [ ] `apps/web/src/lib/utils/format.ts` — number/date formatting
- [ ] `apps/web/src/lib/utils/constants.ts` — categories, sort options
- [ ] Layout: `Header.svelte`, `Footer.svelte`, `+layout.svelte`
- [ ] `SearchBar.svelte` — debounced, URL state sync
- [ ] `CategoryTabs.svelte` — with facet counts
- [ ] `SortSelect.svelte`, `ProvideTag.svelte`
- [ ] `ExtensionCard.svelte`
- [ ] `Pagination.svelte`
- [ ] `+page.server.ts` + `+page.svelte` — wire browse page
- [ ] Test: search, filter, sort, paginate, URL state

### Phase 4: Frontend — Detail Page (Days 7-8)

- [ ] `ReadmeRenderer.svelte` — GitHub-flavored markdown CSS
- [ ] `Sidebar.svelte` — stats, authors, links
- [ ] `VersionHistory.svelte` — scrollable version list
- [ ] `DownloadChart.svelte` — SVG sparkline
- [ ] `InstallButton.svelte` — `zed://extensions/{id}` deep link
- [ ] `SEOHead.svelte` — meta/OG tags
- [ ] `extensions/[id]/+page.server.ts` + `+page.svelte`
- [ ] Test: README rendering, sidebar data, version list

### Phase 5: Polish & Deploy (Days 9-10)

- [ ] Full GitHub metadata sync (run overnight for all extensions)
- [ ] Set up cron scheduling in Hono backend
- [ ] Loading states, error states, empty states
- [ ] Responsive design pass (mobile, tablet, desktop)
- [ ] SEO: sitemap.xml, robots.txt
- [ ] Deploy: SvelteKit → Vercel, Hono → Railway, Meilisearch → Meilisearch Cloud
- [ ] Configure cron triggers for production

### Future Phases

- [ ] User ratings/reviews (requires auth — Supabase Auth or OAuth)
- [ ] Extension comparison view (side-by-side)
- [ ] Dynamic OG image generation per extension
- [ ] Code browser (view extension source via GitHub API tree)
- [ ] Curated collections ("Best Themes", "Essential Language Support")
- [ ] "Install in Zed" browser extension for one-click install
- [ ] API for third-party integrations

---

## 18. Verification & Testing

### Manual Testing Checklist

1. **Data pipeline:** Run `POST /api/sync/zed`, verify all extensions appear in Supabase
2. **GitHub sync:** Run `POST /api/sync/github`, verify stars/README populated for synced extensions
3. **Search:** Query `/api/search?q=python`, verify relevant results with typo tolerance
4. **Facets:** Query `/api/search?category=themes`, verify only theme extensions returned
5. **Detail page:** Visit `/extensions/catppuccin`, verify README renders with images, sidebar shows stars/license
6. **Version history:** Verify all versions listed with correct dates
7. **Deep link:** Click "Install in Zed" button, verify `zed://extensions/catppuccin` opens Zed
8. **Responsive:** Test browse and detail pages at 375px, 768px, 1280px widths
9. **SEO:** Check `<title>`, `<meta description>`, OG tags on both page types
10. **Edge cases:** Extension with no README, no repo URL, repo returning 404, monorepo extension (`zed-industries/zed`)

### Automated Testing (Future)

- **Unit tests** (Vitest): parse-repo-url, parse-author, format utils, markdown image rewriting
- **Integration tests**: sync pipeline against mock API responses
- **E2E tests** (Playwright): search flow, navigation to detail page, responsive layout

---

## 19. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Zed API changes or goes down | No new data | Cache aggressively, fall back to last-known DB state |
| GitHub API rate limit exhaustion | Stale metadata | Checkpoint sync progress, conditional requests (ETag), stagger syncs |
| Meilisearch downtime | Search broken | Fall back to Postgres `ILIKE` query in the API layer |
| Zed changes extension protocol | Deep links break | Monitor Zed releases, keep `zed://` scheme updated |
| Legal: scraping/republishing concerns | Takedown risk | Link back to original repos, credit authors, add disclaimer |
| Extensions > 5000 (growth) | API cap, DB load | Pagination strategy already handles this; Meilisearch scales well |

---

## 20. Security & Privacy

### Data We Store

We store only **publicly available data**: extension metadata from the Zed API, README content and repository statistics from public GitHub repos. No user data, no PII, no cookies, no analytics tracking in v1.

### Secrets Management

| Secret | Stored In | Scope |
|--------|-----------|-------|
| `SUPABASE_SERVICE_KEY` | Environment variable (server only) | Full DB access — never exposed to frontend |
| `GITHUB_TOKEN` | Environment variable (server only) | Read-only GitHub API access (PAT with `public_repo` scope only) |
| `MEILISEARCH_API_KEY` | Environment variable (server only) | Master key — only the backend uses this |
| `SYNC_API_KEY` | Environment variable (server only) | Protects sync trigger endpoints from unauthorized calls |

The SvelteKit frontend has **zero secrets**. It only talks to the Hono backend's public API routes.

### Attack Surface

| Vector | Risk | Mitigation |
|--------|------|------------|
| **Sync trigger endpoints** | Unauthorized party triggers sync, wastes GitHub API quota | API key required in `X-API-Key` header; reject without it |
| **Meilisearch direct access** | If exposed, attacker could read/modify search index | Bind Meilisearch to localhost or private network; never expose publicly |
| **README XSS** | Malicious README injects JavaScript via rendered HTML | Sanitize all rendered HTML with DOMPurify; strict allowlist of tags/attributes |
| **GitHub API token leak** | Token in logs or error messages | Never log request headers; use environment variables, not config files |
| **Supabase connection string** | Full DB access if leaked | Only used server-side; Row Level Security (RLS) enabled as defense-in-depth |

### README Sanitization

READMEs are user-generated content from thousands of GitHub repos. The rendering pipeline **must** sanitize output:

- DOMPurify strips `<script>`, `<iframe>`, `onclick` handlers, `javascript:` URLs
- Images are allowed but only from `https://` and `raw.githubusercontent.com` origins
- Links open in new tab with `rel="noopener noreferrer"`

---

## 21. Service Level Objectives

| Metric | Target | How Measured |
|--------|--------|--------------|
| **Browse page load time (SSR)** | < 500ms (p95) | Server response time in Vercel/Cloudflare analytics |
| **Detail page load time (SSR)** | < 800ms (p95) | Server response time (includes README rendering) |
| **Search latency** | < 50ms (p95) | Meilisearch query time (logged in API response) |
| **Data freshness — Zed API** | < 6 hours stale | Cron runs every 6h; `zed_api_synced_at` column |
| **Data freshness — GitHub** | < 24 hours stale | Cron runs daily; `github_synced_at` column |
| **Uptime** | 99.5% | Vercel/Railway status; uptimerobot or similar |
| **Extension coverage** | 100% of registered extensions | Compare DB count vs `extensions.toml` count |

These are internal targets, not public SLAs. No pager or on-call in v1.

---

## 22. Alternatives Considered

### Frontend Framework

| Option | Considered | Decision |
|--------|-----------|----------|
| **Next.js 15** | Largest React ecosystem, RSC support, excellent Vercel integration | Rejected: heavier bundle, React Server Components add complexity for this scope |
| **Nuxt 4** | What npmx.dev uses, Vue-based, good SSR story | Rejected: user prefers Svelte DX, smaller ecosystem for our needs |
| **SvelteKit** | Lighter, faster, less boilerplate, native SSR | **Chosen**: best DX for a small team, excellent performance |

### Database

| Option | Considered | Decision |
|--------|-----------|----------|
| **No database (SWR only)** | How npmx.dev works — cache external APIs at request time | Rejected: Zed API is too limited (no README, stars), GitHub enrichment is rate-limited. On-demand fetching would exhaust rate limits quickly |
| **SQLite (Turso)** | Edge-native, cheapest, simplest | Rejected: less tooling, harder to query from both frontend and backend |
| **Supabase (PostgreSQL)** | Managed Postgres, free tier, built-in auth for future | **Chosen**: best balance of power, cost, and future extensibility |

### Search Engine

| Option | Considered | Decision |
|--------|-----------|----------|
| **Postgres full-text search** | No extra service, `pg_trgm` + `to_tsvector` | Rejected: weaker typo tolerance, no faceted filtering, slower for instant search |
| **Algolia** | What npmx.dev uses, excellent but expensive at scale | Rejected: overkill for ~1600 documents, expensive if we grow |
| **Meilisearch** | Typo-tolerant, faceted filtering, self-hostable, generous free tier | **Chosen**: best fit for our scale and budget |

### Architecture

| Option | Considered | Decision |
|--------|-----------|----------|
| **SvelteKit monolith** | One deployment, simpler, cron via external trigger | Rejected: couples sync lifecycle to web app deploys, limited scheduling control |
| **SvelteKit + Supabase Edge Functions** | Serverless sync, no server to manage | Rejected: Deno runtime quirks, cold starts, harder to debug sync pipeline |
| **SvelteKit frontend + Hono/Bun backend** | Clean separation, native cron, dedicated search proxy | **Chosen**: best separation of concerns, easy to develop/debug independently |

---

## 23. Open Questions

1. **Domain name:** Is `zedext.dev` available? Alternatives: `zedmarket.dev`, `zedpkg.dev`, `zextensions.dev`.

2. **Meilisearch hosting:** Self-host on Railway (more control, ~$5/month) or use Meilisearch Cloud free tier (10K documents, 100K searches/month — should be sufficient for v1)?

3. **GitHub token strategy:** Use a personal access token or create a GitHub App? A GitHub App gets a higher rate limit (5000/hr per installation vs per user) and looks more professional.

4. **Monorepo extensions (`zed-industries/zed`):** Some extensions like `html` have their repository set to the main Zed repo. Should we skip GitHub metadata for these entirely, or display it with a disclaimer?

5. **Legal/licensing:** We're displaying README content and metadata from other people's GitHub repos. Is a simple attribution footer ("Data sourced from GitHub and the Zed extension registry") sufficient, or do we need per-extension license compliance?

6. **Analytics:** Do we want basic anonymous analytics (e.g., Plausible, Umami) to understand which extensions are viewed most? This would help prioritize features but is a non-goal in v1.

7. **Notification to Zed team:** Should we reach out to the Zed team before launching? They might appreciate it, or they might see it as fragmenting their ecosystem.
