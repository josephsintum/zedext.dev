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
5. **Fast and accessible:** Pages load in under 1 second (SSR), work on mobile, and are fully keyboard-navigable.
6. **SEO-optimized:** Each extension has a unique, indexable page with proper meta/OG tags — so extensions are discoverable via Google.
7. **Low operating cost:** Target ~$0/month (Algolia free tier + free hosting tier). No database, no servers to manage.
8. **Data freshness:** Algolia index updated every 6 hours. Detail page data fetched on-demand (always fresh).
9. **Complete coverage:** Index all ~1,600+ extensions, not just the top 1,000 returned by the Zed API.

---

## 4. Non-Goals (v1)

- **User accounts or auth** — No login, no saved preferences, no personalized recommendations.
- **Ratings or reviews** — Requires auth and moderation. Deferred to a future phase.
- **Extension publishing** — We are read-only consumers of the Zed registry. Authors continue to publish via PR to `zed-industries/extensions`.
- **In-browser extension installation** — We link to `zed://extensions/{id}` but don't attempt to fix Zed's broken deep-link handling.
- **Code browser** — Browsing extension source code (like npmx.dev's code tab) is interesting but not MVP.
- **Download trend charts** — Requires persistent storage for historical snapshots. Deferred — we show current download count only.
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

### npmx.dev (Primary Architectural Reference)

npmx.dev is a Nuxt 4 full-stack app that wraps the npm registry. It uses **no traditional database** — all data is fetched on-demand from the npm registry and GitHub, cached with SWR (stale-while-revalidate). We follow the same pattern.

| Pattern | How npmx.dev Does It | How We Do It |
|---------|---------------------|--------------|
| **No database** | Fetches everything on-demand, caches with SWR | Same: on-demand from Zed API + GitHub API, in-memory cache |
| **Search** | Algolia client-side (lite client 13KB) with npm API fallback | Same: Algolia primary, Zed API as fallback |
| **README** | Fetched on-demand from npm registry, cached per request | Fetched on-demand from GitHub API, cached in memory (24h TTL) |
| **Styling** | UnoCSS with CSS variable theme system | Tailwind CSS v4 with CSS variables |
| **Caching** | Multi-layer: fetch cache (SWR) → payload cache (ISR) → Redis | In-memory cache → SvelteKit HTTP headers → CDN edge |

### VS Code Marketplace (UX Reference)

- Tabbed detail pages (Overview, Version History, Q&A, Ratings)
- Rich metadata sidebar (categories, resources, project details, compatibility)
- Star ratings and review counts
- Screenshot carousel

---

## 7. Architecture Overview

```
┌──────────────────────────────────────────────┐
│              SvelteKit App                    │
│                                              │
│  Browser ────▶ Algolia    (client-side search)│
│  Browser ────▶ Zed API    (search fallback)  │
│                                              │
│  +page.server.ts ──▶ Zed API   (extension    │
│                  ──▶ GitHub API  detail data) │
│                  ──▶ In-memory   (cache)      │
│                       cache                   │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│        scripts/sync.ts  (cron, every 6h)     │
│                                              │
│  Zed API ──▶ enrich ──▶ Algolia index        │
│  GitHub API ──┘                              │
└──────────────────────────────────────────────┘
```

**No database. No backend server. No persistence.**

- **Browse/search:** Algolia handles it entirely client-side
- **Detail pages:** SvelteKit server routes fetch from Zed API + GitHub API on-demand, cache in memory
- **Cron script:** Fetches all extensions from Zed API, enriches with GitHub stars/license, pushes to Algolia
- **Fallback:** If Algolia is down, client searches Zed API directly

### Why No Database?

We started with Supabase (Postgres), then simplified to SQLite, then asked: what is the database actually doing? The answer: caching data we can fetch on-demand. With ~1,600 extensions, in-memory caching is sufficient. The Zed API and GitHub API are the sources of truth — we don't need to duplicate them into a database. This is exactly how npmx.dev works with millions of npm packages.

---

## 8. Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Framework** | SvelteKit + TypeScript | SSR for SEO, lighter than Nuxt/Next, handles both UI and server routes |
| **Styling** | Tailwind CSS v4 | CSS-first config, fast iteration, uses CSS variables natively |
| **Search** | Algolia (free tier) | Client-side, typo-tolerant, faceted filtering — same pattern as npmx.dev |
| **Search fallback** | Zed API (`api.zed.dev/extensions?filter=...`) | Free, no infrastructure, graceful degradation |
| **Markdown** | marked + DOMPurify + shiki | Fast parsing, safe HTML output, syntax highlighting |
| **Hosting** | Vercel | Free tier, edge CDN caching via `Cache-Control` headers, zero config SvelteKit deploy |
| **Package manager** | pnpm | Fast, disk-efficient |

No database. No Redis. No Meilisearch. No separate backend.

---

## 9. Data Sources

### 9.1 Zed Extension API (`api.zed.dev`)

| Endpoint | Method | Description | Used By |
|----------|--------|-------------|---------|
| `/extensions?max_schema_version=1` | GET | Up to 1000 extensions sorted by downloads | Cron script (index all), search fallback |
| `/extensions/:id` | GET | All published versions of a single extension | Detail page (on-demand) |
| `/extensions?filter=query&max_schema_version=1` | GET | Text search | Search fallback (when Algolia unavailable) |

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

**Limitations:** Max 1000 results (no pagination). ~1,600+ extensions exist — cron script also parses `extensions.toml` from the registry for complete coverage.

### 9.2 Extensions Registry (`github.com/zed-industries/extensions`)

- **`extensions.toml`** — Complete list of ALL registered extensions (bypasses the 1000 API cap)
- **`.gitmodules`** — Maps extension submodule paths to source Git repository URLs

### 9.3 GitHub API (via `repository` URL per extension)

| Endpoint | Data | Used By |
|----------|------|---------|
| `GET /repos/{owner}/{repo}` | Stars, forks, issues, license, pushed_at, topics | Cron script (for Algolia) + detail page (on-demand) |
| `GET /repos/{owner}/{repo}/readme` | README markdown content (base64) | Detail page (on-demand only) |

**Rate limit:** 5000 requests/hour with authenticated token.
- Cron: ~1,600 repo metadata requests per sync = well within limits
- On-demand: ~50-100 detail page views per hour realistically = negligible

---

## 10. Data Model

### 10.1 Algolia Index

The Algolia index is the only persisted data store. It's populated by the cron script.

**Index name:** `extensions`

```typescript
interface AlgoliaExtension {
  objectID: string;           // Extension id (Algolia primary key)
  name: string;
  description: string | null;
  authors: string[];          // Names only (emails stripped)
  provides: string[];         // ["languages", "grammars", "language-servers"]
  download_count: number;
  github_stars: number;
  github_license: string | null;
  github_pushed_at: string | null;
  published_at: string;       // ISO 8601
  published_at_timestamp: number;  // Unix timestamp for sorting
  version: string;
  repository: string | null;
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

### 10.2 Multi-Layer Caching (following npmx.dev pattern)

Caching works differently in development vs production. We use a layered strategy inspired by npmx.dev:

```
Layer 1: In-memory Map        (fastest, lost on server restart)
Layer 2: Filesystem (.cache/)  (survives restarts, used in dev)
Layer 3: Vercel CDN edge       (production only, caches full SSR responses)
```

#### Layer 1 + 2: Fetch Cache (`src/lib/server/cache.ts`)

A generic cache wrapper used by `zed-api.ts` and `github-api.ts` to avoid redundant API calls:

```typescript
async function getCached<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
  // L1: in-memory Map (instant, lost on restart)
  if (memoryCache.has(key) && !expired(key)) return memoryCache.get(key);

  // L2: filesystem — dev only (survives restarts, gitignored)
  if (dev) {
    const file = `.cache/${hash(key)}.json`;
    if (existsSync(file) && !fileExpired(file, ttlMs)) {
      const data = JSON.parse(readFileSync(file));
      memoryCache.set(key, { data, expiry: Date.now() + ttlMs });
      return data;
    }
  }

  // L3: fetch from source (Zed API, GitHub API)
  const data = await fetcher();
  memoryCache.set(key, { data, expiry: Date.now() + ttlMs });
  if (dev) writeFileSync(`.cache/${hash(key)}.json`, JSON.stringify(data));
  return data;
}
```

| Cache Key Pattern | TTL | What |
|-------------------|-----|------|
| `zed:ext:{id}` | 1 hour | Extension metadata + all versions from Zed API |
| `gh:meta:{owner}/{repo}` | 1 hour | GitHub stars, forks, license, pushed_at |
| `gh:readme:{owner}/{repo}` | 24 hours | Rendered README HTML (most expensive to produce) |

In development, the `.cache/` directory means you can restart the dev server freely without re-fetching from GitHub on every page load.

#### Layer 3: Vercel CDN Edge (Production)

In production, `Cache-Control` headers on SSR responses let Vercel's CDN cache the entire rendered page at the edge. The server function (and fetch cache) only runs on CDN cache miss.

```typescript
// In +page.server.ts
setHeaders({
  'cache-control': 'public, s-maxage=3600, stale-while-revalidate=86400'
});
```

| Page | `s-maxage` | `stale-while-revalidate` | Cold fetch time |
|------|-----------|--------------------------|-----------------|
| **Browse page** (`/`) | 5 min | 1 hour | ~200ms (Zed API for SEO content) |
| **Detail page** (`/extensions/:id`) | 1 hour | 24 hours | ~1-1.5s (3 API calls in parallel + markdown rendering) |

After the first visitor triggers a cold fetch, subsequent visitors get the cached page in < 50ms from the nearest Vercel edge node. Stale-while-revalidate ensures no visitor ever waits for a refresh — they get the stale page instantly while Vercel re-runs the function in the background.

### 10.3 Search Fallback (Zed API)

When Algolia is unavailable, the client falls back to:

```
GET https://api.zed.dev/extensions?filter={query}&max_schema_version=1
```

Returns up to 1000 results. No typo tolerance, no faceted counts, no custom sorting — but search still works. The UI hides facet counts and shows a simplified result list.

---

## 11. Sync Pipeline

The sync pipeline is a standalone script (`scripts/sync.ts`). It fetches data from the Zed API and GitHub API, then pushes enriched documents to Algolia. Runs every 6 hours via cron (GitHub Actions scheduled workflow or system cron).

### 11.1 Sync Flow

```
1. Fetch extensions.toml from GitHub raw URL → parse for complete extension ID list (~1,600+)
2. Fetch GET api.zed.dev/extensions?max_schema_version=1 → up to 1000 extensions
3. For IDs in extensions.toml but NOT in API response:
   Fetch GET api.zed.dev/extensions/{id} individually (rate: 10 req/sec)
4. For each extension with a GitHub repository URL:
   Fetch GET api.github.com/repos/{owner}/{repo} → stars, forks, license, pushed_at
   (rate: ~1.3 req/sec to stay within 5000/hr)
5. Transform each extension into an AlgoliaExtension document
6. Push all documents to Algolia index (batch upsert)
```

### 11.2 Edge Cases

| Case | Handling |
|------|----------|
| Extension repo returns 404 | Set GitHub fields to null in Algolia doc, skip for 7 days |
| Repo is `zed-industries/zed` (monorepo) | Flag as "core extension" — GitHub stars/forks are for Zed itself, not the extension |
| GitHub rate limit exhausted mid-sync | Checkpoint progress (track last synced ID), push partial update to Algolia, resume on next run |
| Extension removed from registry | Remove from Algolia index |
| Zed API down | Skip sync, Algolia retains last-known data |

---

## 12. Frontend (SvelteKit)

### 12.1 Route Structure

```
src/routes/
├── +layout.svelte              # Header, slot, Footer
├── +page.svelte                # Browse / Search page (/)
├── +page.server.ts             # SSR: initial top extensions (optional, for SEO)
└── extensions/
    └── [id]/
        ├── +page.svelte        # Extension detail page
        └── +page.server.ts     # SSR: fetch from Zed API + GitHub API (on-demand)
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
├── InstallButton.svelte        # "Install in Zed" deep link button
└── SEOHead.svelte              # Meta tags, OG tags
```

### 12.3 Browse / Search Page (`/`)

**URL state:** `/?q=python&category=language-servers&sort=stars&page=2`

**Search flow:**
1. **Initial SSR load** (`+page.server.ts`): optionally fetch top extensions from Zed API for SEO content. Or render a shell and let Algolia hydrate client-side.
2. **Client-side search** (after hydration): Algolia lite client handles search directly from the browser. No server roundtrip. Typing in the search bar queries Algolia instantly.
3. **Fallback:** If Algolia fails, fall back to Zed API `?filter=` parameter. UI gracefully degrades — no facet counts, basic results.

**UI elements:**
- Search bar — debounced (300ms), updates URL via `goto()` with `replaceState`
- Category tabs — horizontal scroll, facet counts from Algolia response
- Sort dropdown — downloads (default), recently updated, name, stars
- Extension grid — responsive: 1 col mobile, 2 col tablet, 3-4 col desktop
- Pagination at bottom

### 12.4 Extension Detail Page (`/extensions/[id]`)

**Data flow in `+page.server.ts`:**

1. **Set cache headers:** `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400` — Vercel CDN caches the entire response. Most visitors never trigger this function.
2. **Extension metadata + versions:** Fetch `GET api.zed.dev/extensions/{id}` → returns all published versions. Use latest version for metadata.
3. **GitHub metadata:** Fetch `GET api.github.com/repos/{owner}/{repo}` → stars, forks, license, pushed_at.
4. **README:** Fetch `GET api.github.com/repos/{owner}/{repo}/readme` → decode base64 → rewrite image URLs → render with marked + shiki → sanitize with DOMPurify.
5. Fetch steps 2-4 **in parallel** (`Promise.all`) to minimize cold fetch time.
6. If any fetch fails: gracefully degrade (show description instead of README, hide GitHub stats).

**Two-column layout (70/30 split):**

**Main column:**
1. Extension name (h1), version badge, provides tags
2. Action buttons: "Install in Zed" (primary), "Visit Repository" (secondary)
3. README rendered HTML with:
   - GitHub-flavored markdown CSS
   - Syntax highlighting via shiki (server-side)
   - Relative image URLs rewritten to `raw.githubusercontent.com`
4. Fallback: show description if no README available

**Sidebar:**
1. Download count (formatted: "4.7M")
2. GitHub stars / forks / open issues
3. License badge
4. Last updated (relative + absolute)
5. Authors list (names parsed, emails stripped)
6. Repository link
7. Version history (scrollable, all versions with dates)

### 12.5 Caching Strategy

Three layers (see section 10.2 for full details):

1. **In-memory Map** — fastest, used within a single serverless invocation
2. **Filesystem `.cache/`** — dev only, survives server restarts
3. **Vercel CDN edge** — production, `Cache-Control` headers cache full SSR responses

In production, most visitors hit the CDN cache and never trigger the server function. On CDN miss, the server function uses the fetch cache (L1/L2) to avoid redundant API calls within the same invocation, then sets `Cache-Control` headers so the response is cached at the edge for subsequent visitors.

---

## 13. Markdown Rendering Pipeline

README rendering is the core differentiator. Fetched on-demand from GitHub, rendered server-side. The full page response is cached at the Vercel CDN edge — the rendering pipeline only runs on cache miss.

```
User visits /extensions/catppuccin
  │
  ▼
Vercel CDN edge
  │
  ├── Cached → return instantly (< 50ms, rendering doesn't run)
  │
  └── Cache miss → run +page.server.ts:
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
      Return page with Cache-Control header → Vercel caches for next visitor
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
│   │   │   ├── cache.ts            # Multi-layer cache: in-memory + filesystem (dev) + CDN (prod)
│   │   │   ├── zed-api.ts          # Zed API client (fetch extensions, versions)
│   │   │   ├── github-api.ts       # GitHub API client (repo metadata, README)
│   │   │   ├── markdown.ts         # marked + shiki + DOMPurify + image URL rewrite
│   │   │   ├── parse-author.ts     # "Name <email>" → { name, email }
│   │   │   └── parse-repo-url.ts   # GitHub URL → { owner, repo }
│   │   ├── components/             # 13 Svelte components (see 12.2)
│   │   ├── stores/
│   │   │   └── search.ts           # Algolia search state + fallback logic
│   │   ├── utils/
│   │   │   ├── format.ts           # formatNumber, formatDate, timeAgo
│   │   │   └── constants.ts        # CATEGORIES, SORT_OPTIONS
│   │   └── types.ts                # All TypeScript interfaces
│   └── routes/                     # See section 12.1
├── scripts/
│   └── sync.ts                     # Cron: Zed API + GitHub API → Algolia index
├── .cache/                         # Filesystem cache (dev only, gitignored)
├── static/
│   └── favicon.ico
├── svelte.config.js
├── vite.config.ts
├── package.json
├── .env.example
├── DESIGN.md
└── README.md
```

**13 files of application code.** No monorepo, no database, no backend service.

---

## 15. Environment Variables

```bash
# GitHub (server-only, used by sync script + detail page fetches)
GITHUB_TOKEN=ghp_...

# Algolia
PUBLIC_ALGOLIA_APP_ID=XXXXXXXXXX
PUBLIC_ALGOLIA_SEARCH_KEY=xxxxxxxxxxxx  # Read-only, safe for client
ALGOLIA_ADMIN_KEY=xxxxxxxxxxxx          # Write key, server/sync only

# App
PUBLIC_SITE_URL=https://zedext.dev
```

**4 environment variables.** The Algolia search key is intentionally public (read-only, same as npmx.dev).

---

## 16. Implementation Phases

### Phase 0: Scaffolding

- [x] Design document
- [ ] Scaffold SvelteKit app with Tailwind CSS v4
- [ ] Create Algolia account + configure index settings
- [ ] Create `.env.example`
- [ ] Define TypeScript types (`src/lib/types.ts`)

### Phase 1: Data Pipeline

- [ ] `scripts/sync.ts` — Zed API + GitHub metadata → Algolia index
- [ ] `src/lib/server/parse-repo-url.ts`, `parse-author.ts` — utility functions
- [ ] Run first sync, verify all ~1,600 extensions in Algolia

### Phase 2: Frontend — Browse Page

- [ ] `src/lib/utils/format.ts` — number/date formatting
- [ ] `src/lib/utils/constants.ts` — categories, sort options
- [ ] Layout: `Header.svelte`, `Footer.svelte`, `+layout.svelte`
- [ ] `SearchBar.svelte` — Algolia client-side search with Zed API fallback
- [ ] `CategoryTabs.svelte` — facet counts from Algolia
- [ ] `SortSelect.svelte`, `ProvideTag.svelte`, `ExtensionCard.svelte`, `Pagination.svelte`
- [ ] `+page.server.ts` + `+page.svelte` — wire browse page
- [ ] Test: search, filter, sort, paginate, URL state, fallback

### Phase 3: Frontend — Detail Page

- [ ] `src/lib/server/cache.ts` — multi-layer cache (in-memory + filesystem for dev)
- [ ] `src/lib/server/zed-api.ts` — Zed API client (uses cache)
- [ ] `src/lib/server/github-api.ts` — GitHub API client (uses cache)
- [ ] `src/lib/server/markdown.ts` — render with image rewrite + shiki
- [ ] `ReadmeRenderer.svelte` — GitHub-flavored markdown CSS
- [ ] `Sidebar.svelte`, `VersionHistory.svelte`, `InstallButton.svelte`, `SEOHead.svelte`
- [ ] `extensions/[id]/+page.server.ts` + `+page.svelte`
- [ ] Test: README rendering, sidebar data, version list, cache behavior, graceful degradation

### Phase 4: Polish & Deploy

- [ ] Set up cron (GitHub Actions scheduled workflow)
- [ ] Loading states, error states, empty states
- [ ] Responsive design pass (mobile, tablet, desktop)
- [ ] SEO: sitemap.xml, robots.txt
- [ ] Deploy SvelteKit to Vercel
- [ ] Verify cron + search + detail pages in production

### Future Phases

- [ ] Download trend charts (requires adding persistent storage — SQLite or similar)
- [ ] User ratings/reviews (requires auth)
- [ ] Extension comparison view (side-by-side)
- [ ] Dynamic OG image generation per extension
- [ ] Code browser (view extension source via GitHub API tree)
- [ ] Curated collections ("Best Themes", "Essential Language Support")

---

## 17. Verification & Testing

### Manual Testing Checklist

1. **Sync:** Run `pnpm sync`, verify all ~1,600 extensions in Algolia dashboard
2. **Search:** Type "pythn" (typo) in search bar, verify "Python" appears
3. **Facets:** Click "Themes" tab, verify count matches and only themes shown
4. **Fallback:** Block Algolia in browser DevTools, verify Zed API fallback works
5. **Detail page (cold):** Visit `/extensions/catppuccin` with empty cache — README loads from GitHub
6. **Detail page (warm):** Refresh — README served from cache instantly
7. **Version history:** Verify all versions listed with correct dates
8. **Deep link:** Click "Install in Zed", verify `zed://extensions/catppuccin` opens Zed
9. **Responsive:** Test at 375px, 768px, 1280px widths
10. **SEO:** Check `<title>`, `<meta description>`, OG tags
11. **Edge cases:** Extension with no README, no repo URL, repo returning 404, monorepo extension (`zed-industries/zed`)

### Automated Testing (Future)

- **Unit tests** (Vitest): parse-repo-url, parse-author, format utils, markdown image rewriting, cache TTL behavior
- **Integration tests**: sync pipeline against mock API responses
- **E2E tests** (Playwright): search flow, detail page, responsive layout

---

## 18. Security & Privacy

### Data We Store

**No persistent data storage.** Algolia index contains only publicly available extension metadata. In-memory caches are ephemeral (lost on restart). No user data, no PII, no cookies, no analytics in v1.

### Secrets Management

| Secret | Scope |
|--------|-------|
| `GITHUB_TOKEN` | Server + sync script. Read-only GitHub API access (PAT with `public_repo` scope) |
| `ALGOLIA_ADMIN_KEY` | Sync script only. Write access to Algolia index |
| `PUBLIC_ALGOLIA_SEARCH_KEY` | **Intentionally public.** Read-only search key (standard Algolia pattern) |

### Attack Surface

| Vector | Risk | Mitigation |
|--------|------|------------|
| **README XSS** | Malicious README injects JavaScript via rendered HTML | Sanitize with DOMPurify; strict allowlist of tags/attributes |
| **GitHub API token leak** | Token in logs or error messages | Never log request headers; environment variables only |
| **Algolia admin key leak** | Attacker could modify search index | Only used in sync script; never imported by SvelteKit app |
| **SSRF via repository URL** | Crafted repo URL causes server to fetch from internal network | Validate that repository URL matches `https://github.com/*` pattern before fetching |

### README Sanitization

READMEs are user-generated content from thousands of GitHub repos. The rendering pipeline **must** sanitize output:

- DOMPurify strips `<script>`, `<iframe>`, `onclick` handlers, `javascript:` URLs
- Images allowed only from `https://` origins
- Links open in new tab with `rel="noopener noreferrer"`

---

## 19. Service Level Objectives

| Metric | Target |
|--------|--------|
| **Browse page load** | < 300ms (Algolia client-side search is ~20-50ms) |
| **Detail page (CDN hit)** | < 50ms (served from Vercel edge) |
| **Detail page (CDN miss)** | < 1.5s (Zed API + GitHub API + markdown rendering, in parallel) |
| **Search latency** | < 50ms (Algolia) |
| **Algolia index freshness** | < 6 hours (cron every 6h) |
| **Detail page data freshness** | Always fresh (on-demand fetch, 1h cache for metadata, 24h for README) |
| **Uptime** | 99.5% |

---

## 20. Alternatives Considered

### Database

| Option | Decision |
|--------|----------|
| **Supabase (PostgreSQL)** | Rejected: network latency, cost, and operational overhead for ~1,600 rows. Overengineered |
| **SQLite** | Rejected: still unnecessary — the data we were storing can be fetched on-demand and cached in memory |
| **No database** | **Chosen**: follow the npmx.dev pattern. Algolia is the only persisted store. Everything else is on-demand + in-memory cache |

### Search

| Option | Decision |
|--------|----------|
| **SQLite FTS5** | Rejected: no typo tolerance |
| **Meilisearch** | Rejected: another service to host and manage |
| **Algolia (free tier)** | **Chosen**: client-side, typo-tolerant, faceted, zero infrastructure. Same pattern as npmx.dev |

### Search Fallback

| Option | Decision |
|--------|----------|
| **No fallback** | Rejected: single point of failure |
| **Zed API `?filter=`** | **Chosen**: zero infrastructure, already exists, graceful degradation |

### Architecture

| Option | Decision |
|--------|----------|
| **SvelteKit + Hono + Supabase + Meilisearch** | Rejected: 4 services. Massively overengineered |
| **SvelteKit + SQLite + Algolia** | Rejected: SQLite still unnecessary for this scale |
| **SvelteKit + Algolia + on-demand fetching** | **Chosen**: simplest possible architecture. One app, zero persistence beyond Algolia |

---

## 21. Open Questions

1. **Domain name:** Is `zedext.dev` available? Alternatives: `zedmarket.dev`, `zedpkg.dev`, `zextensions.dev`.

2. **GitHub token strategy:** Personal access token or GitHub App? A GitHub App gets a higher rate limit and looks more professional.

3. **Monorepo extensions (`zed-industries/zed`):** Some extensions like `html` have their repository set to the main Zed repo. Skip GitHub metadata entirely, or display with a disclaimer?

4. **Legal/licensing:** We're displaying README content from other people's repos. A simple attribution footer is likely sufficient, but worth confirming.

5. **Algolia free tier limits:** 10K searches/month might be tight if the site gains traction. Monitor and consider adding server-side SQLite FTS5 as an alternative before hitting the limit.

6. **Notification to Zed team:** Should we reach out before launching? They might appreciate it, or they might see it as fragmenting their ecosystem.
