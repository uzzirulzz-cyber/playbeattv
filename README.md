# PlayBeat TV — Free & Premium Streaming Platform

A real, functioning content ingestion and streaming platform that combines:

- **Free legal library**: Auto-imported public-domain and Creative Commons movies, documentaries, animations, and short films from Wikimedia Commons (no API key needed) and YouTube Data API v3 (key required)
- **Premium IPTV**: Live TV channels, VOD, and series streamed through Xtream Codes–compatible panels (per-line credentials stored in DB)

Built with **Next.js 16 + TypeScript + Prisma + Tailwind CSS 4 + shadcn/ui**.

## Features

### Free Legal Content Engine
- Real import pipeline: discover → fetch metadata → verify license → dedup → classify → publish
- Auto-license verification (Public Domain, CC0, CC BY, CC BY-SA, YouTube CreativeCommons, official channels)
- Auto-classification: movies, series, episodes, documentaries, shorts, animation
- Auto episode grouping into Series/Seasons via regex (SxxExx, EP##, Season x Episode y, Part #)
- Auto-generated SEO (Movie/TVSeries/VideoObject/BreadcrumbList schema), sitemap.xml
- Admin can: bulk discover, quick URL import, edit/extend/delete, manage homepage rails, manage source query library
- Auto-import scheduler (6h / 12h / daily / weekly) with API quota respect

### Premium IPTV Module
- Three line types supported:
  - **Xtream lines** (username + password) — works on any M3U / Xtream player
  - **ActiveCodes** (12–18 digit numeric) — for APK / ISO players, with server-to-server activation callback
  - **Mac addresses** — for set-top boxes with a custom portal URL
- Per-line server URL — supports both 3rd-party customer-side lines AND reseller-managed lines in one table
- Built-in M3U playlist proxy (server-side fetch, never exposes upstream credentials in client)
- Server-side HTTPS streaming proxy (`/api/iptv/proxy`) that fixes:
  - Mixed-content blocking (HTTP streams on HTTPS pages)
  - Missing CORS headers on upstream panels
  - Xtream load-balancer 302 redirects to dynamic CDN hosts
- Custom hls.js loader that routes ALL segment + manifest requests through the proxy
- One-click "Open in Web Player" — auto-launches the upstream Xtream Masters web player with credentials pre-filled
- Reseller API integration (Xtream Masters) for line CRUD — consumes real credits when configured

### Public UI
- Cinematic dark theme (deep black + navy + electric blue + violet, glassmorphism)
- Hero banner with rotating featured items
- Horizontal-scrolling rails (14 default rails, all DB-driven, admin-editable)
- Browse view with type / genre / language / sort filter chips
- Search with debounced autocomplete
- My List + Continue Watching (with watch-progress tracking)
- Unified PlayerAdapter: YouTube iframe / native HTML5 / HLS via hls.js / DASH via dashjs
- Live TV view: 851+ channels in a filterable grid with LIVE/VOD/SERIES type badges

### Admin
- Dashboard: real stats (totals, last 24h, by source, trial usage, API status)
- Quick Import (single URL)
- Search Import (preview + select + import)
- Bulk Discovery (runs all enabled source queries)
- Import Jobs log
- Content Manager (edit / publish / license-override / delete)
- Series list
- Source Query Library editor
- Homepage Row editor (reorder / rename / toggle)
- Audit Log (filter by action)
- Settings (auto-import toggle, auto-publish toggle, frequency, max per run, min duration, IPTV enable/disable)
- Premium IPTV admin: Overview, Lines, ActiveCodes, Mac Addresses, Credit Logs

## Tech Stack

- **Framework**: Next.js 16 (App Router) + Turbopack
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4 + shadcn/ui (New York)
- **Database**: Prisma ORM (SQLite in dev, swap to Postgres for production)
- **State**: Zustand + TanStack Query
- **Player**: hls.js + dashjs + native HTML5 + YouTube iframe
- **Auth**: Token-based admin auth (env-configurable)

## Quick Start (Local Dev)

```bash
# Install dependencies
bun install

# Push DB schema
bun run db:push

# Seed the database (source queries, homepage rows, real Wikimedia import)
bun run scripts/seed.ts

# (Optional) Seed a real IPTV subscription
bun run scripts/seed-iptv-line.ts

# Start dev server
bun run dev
```

Open http://localhost:3000.

For full deployment instructions (Vercel + GitHub + env vars + domain), see [DEPLOY.md](./DEPLOY.md).

## Project Structure

```
.
├── prisma/schema.prisma        # 16 Prisma models
├── src/
│   ├── app/api/                 # 30+ API routes (public + admin)
│   ├── components/playbeat/     # UI components (header, hero, rail, card, player, admin)
│   ├── lib/
│   │   ├── import/              # ContentImportEngine, YouTube + Wikimedia importers, license verifier
│   │   ├── xtream/              # Xtream Masters reseller API client
│   │   └── auth/                # Admin token auth
│   ├── stores/app.ts            # Zustand store
│   └── middleware.ts            # CSP for mixed-content + blob: support
├── scripts/
│   ├── seed.ts                  # Seed source queries + homepage rows + run real Wikimedia import
│   └── seed-iptv-line.ts        # Seed a real IPTV subscription as an IptvLine
└── DEPLOY.md                    # Production deployment guide
```

## License

MIT — see [LICENSE](./LICENSE). Content streamed via the platform retains its original license (public domain, CC BY, CC BY-SA, etc.) and is attributed per the requirements of each license.
