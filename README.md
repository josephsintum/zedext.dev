# ZedExt

A fast, modern extension browser for the [Zed editor](https://zed.dev) — with rich READMEs, GitHub stats, and powerful search.

## Why

Zed's official extension page at [zed.dev/extensions](https://zed.dev/extensions) shows only a name, one-line description, and download count. No README, no GitHub stats, no version history. ZedExt fills that gap.

## Features

- **Rich extension pages** — full README with syntax highlighting and resolved images
- **GitHub context** — stars, license, last commit, forks, open issues
- **Better search** — typo-tolerant, instant search with category filters and sort options, running in the browser
- **Version history** — all published versions with dates
- **SEO-friendly** — every extension has a unique, indexable page with proper meta/OG tags
- **Dark mode** — system-aware with manual toggle

## Architecture

No database and no search service. A daily Vercel cron hits a protected `/api/sync` route, which builds a snapshot of the whole registry (Zed API + GitHub stats) and writes it to Vercel Blob as `extensions.json`. The server renders the first page of results from that snapshot, then the browser loads it and searches locally with [MiniSearch](https://github.com/lucaong/minisearch). Detail pages are fetched on demand from the Zed and GitHub APIs and cached in memory.

```
Browser ──► /extensions.json (snapshot → local search)
Server  ──► Zed API        (extension metadata + versions)
        ──► GitHub API     (stars, README, license)
        ──► In-memory cache (1h metadata, 24h README)
        ──► Vercel Blob    (extensions.json snapshot)
Cron    ──► /api/sync      (registry + GitHub → snapshot)
```

## Stack

- [SvelteKit](https://svelte.dev) — framework
- [Tailwind CSS v4](https://tailwindcss.com) — styling
- [MiniSearch](https://github.com/lucaong/minisearch) — search
- [Vercel Blob](https://vercel.com/docs/vercel-blob) — snapshot storage
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

# Rebuild the snapshot (requires GITHUB_TOKEN + BLOB_READ_WRITE_TOKEN)
pnpm sync
```

## Environment variables

```bash
GITHUB_TOKEN=ghp_...                    # GitHub API (server + sync)
SNAPSHOT_URL=https://….public.blob.vercel-storage.com/extensions.json  # Snapshot to read
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_…  # Blob write access (sync only)
CRON_SECRET=replace-with-long-random    # Vercel cron bearer token
PUBLIC_SITE_URL=https://zedext.dev      # Site URL
```

## Vercel cron

`vercel.json` schedules `GET /api/sync` once daily at midnight UTC using `0 0 * * *`. The route checks `Authorization: Bearer $CRON_SECRET` and then runs the same shared sync logic as `pnpm sync`, so manual and scheduled syncs stay identical.

- This schedule works on the Vercel Hobby plan (free).
- The sync route is configured as a long-running Node function (`maxDuration = 300`) for Vercel cron use.
- You can still refresh manually at any time with `pnpm sync`, or by calling `/api/sync` with the same bearer token.

## Contributing

Contributions, issues, and feature requests are welcome. See the [issues page](https://github.com/josephsintum/zedext.dev/issues).

## License

MIT
