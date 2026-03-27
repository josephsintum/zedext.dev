# ZedExt

A fast, modern extension browser for the [Zed editor](https://zed.dev) — with rich READMEs, GitHub stats, and powerful search.

## Why

Zed's official extension page at [zed.dev/extensions](https://zed.dev/extensions) shows only a name, one-line description, and download count. No README, no GitHub stats, no version history. ZedExt fills that gap.

## Features

- **Rich extension pages** — full README with syntax highlighting and resolved images
- **GitHub context** — stars, license, last commit, forks, open issues
- **Better search** — typo-tolerant, faceted search with category filters and sort options (powered by Algolia)
- **Version history** — all published versions with dates
- **SEO-friendly** — every extension has a unique, indexable page with proper meta/OG tags
- **Dark mode** — system-aware with manual toggle

## Architecture

No database. All data is fetched on-demand from the Zed API and GitHub API, then cached in memory. Search is powered by Algolia, with the index refreshed every 6 hours via Vercel cron hitting a protected `/api/sync` route.

```
Browser ──► Algolia        (client-side search)
Server  ──► Zed API        (extension metadata + versions)
        ──► GitHub API     (stars, README, license)
        ──► In-memory cache (1h metadata, 24h README)
Cron    ──► /api/sync      (Vercel cron → Algolia refresh)
```

## Stack

- [SvelteKit](https://svelte.dev) — framework
- [Tailwind CSS v4](https://tailwindcss.com) — styling
- [Algolia](https://algolia.com) — search
- [Shiki](https://shiki.style) — syntax highlighting
- [Vercel](https://vercel.com) — hosting

## Getting started

```sh
# Install dependencies
pnpm install

# Copy env vars
cp .env.example .env

# Start dev server
pnpm dev

# Sync extensions to Algolia (requires GITHUB_TOKEN + ALGOLIA_ADMIN_KEY)
pnpm sync
```

## Environment variables

```bash
GITHUB_TOKEN=ghp_...                    # GitHub API (server + sync)
PUBLIC_ALGOLIA_APP_ID=XXXXXXXXXX        # Algolia app ID (public)
PUBLIC_ALGOLIA_SEARCH_KEY=xxxxxxxxxxxx  # Algolia search key (public, read-only)
ALGOLIA_ADMIN_KEY=xxxxxxxxxxxx          # Algolia admin key (sync only)
CRON_SECRET=replace-with-long-random    # Vercel cron bearer token
PUBLIC_SITE_URL=https://zedext.dev      # Site URL
```

## Vercel cron

`vercel.json` schedules `GET /api/sync` every 6 hours using `0 */6 * * *` (UTC). The route checks `Authorization: Bearer $CRON_SECRET` and then runs the same shared sync logic as `pnpm sync`, so manual and scheduled syncs stay identical.

Important constraints from Vercel's current cron model:

- A 6-hour schedule requires the Vercel Pro plan. Hobby cron jobs can only run once per day.
- The sync route is configured as a long-running Node function (`maxDuration = 800`) for Vercel cron use.
- You can still refresh manually at any time with `pnpm sync`, or by calling `/api/sync` with the same bearer token.

## Contributing

Contributions, issues, and feature requests are welcome. See the [issues page](https://github.com/josephsintum/zedext.dev/issues).

## License

MIT
