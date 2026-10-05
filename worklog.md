# PlayBeat TV — Worklog

---
Task ID: 1
Agent: main (super-z)
Task: Build complete AUTOMATIC CONTENT IMPORT AND PUBLISHING SYSTEM for PlayBeat TV (playbeattv.buzz)

Work Log:
- Initialized Next.js 16 fullstack environment via `init-fullstack.sh`
- Designed Prisma schema (Content, Series, Season, Episode, ImportJob, ImportJobItem, SourceQuery, HomepageRow, AuditLog, Settings, User, WatchlistItem, WatchProgress) and pushed to SQLite
- Built import engine (`src/lib/import/`): util.ts, detector.ts, license.ts, classifier.ts, sources.ts, youtube.ts, wikimedia.ts, engine.ts
  - Real YouTube Data API v3 integration (search + videos.list + channels.list, requires YOUTUBE_API_KEY)
  - Real Wikimedia Commons API integration (no API key needed; correctly merges videoinfo + imageinfo to capture both duration and extmetadata license)
  - License verifier recognizes CC0, CC BY, CC BY-SA, Public Domain, YouTube CreativeCommons, official YouTube channels, PlayBeat-owned
  - Episode detection via regex (SxxExx, EP##, Season x Episode y, Part #, Chapter #)
  - Movie vs short vs documentary vs animation classification heuristics
  - Genre + language detection
  - Duplicate detection by source ID + normalized title+year + episode composite key
  - Auto-publish gate: only Verified items are published; Review Required items are saved but unpublished
  - Trending score: weighted blend of plays/completions/favorites/likes + source popularity + freshness boost
- Built admin auth helper (token-based, env-configurable; falls back to dev-open when no ADMIN_TOKEN set)
- Built all 26 API endpoints under /api (content, content/[slug], series/[slug], series/[slug]/episodes, search, homepage, watchlist, watch-progress, sitemap, admin/import/{url,search,bulk,jobs,settings,source-queries}, admin/content, admin/content/[id], admin/series, admin/series/[id], admin/audit, admin/stats, admin/homepage-rows, admin/health, admin/status)
- Built cinematic OTT UI at single visible route `/`:
  - Zustand store with view state (home | browse | search | mylist | watch | admin) + persisted userId + admin flag
  - Hero banner with rotating featured items
  - Horizontal scrolling content rails
  - Browse view with type/genre/language/sort filter chips
  - Search view with debounced query
  - My List with continue-watching progress bars
  - Watch view with PlayerAdapter (YouTube iframe, native HTML5 for .mp4/.webm, dynamic hls.js for .m3u8, dynamic dashjs for .mpd), license/attribution panel, episode selector for series
  - Admin section: dashboard stats, quick URL import, search import (preview + select + import), bulk discovery, import jobs log, content manager (edit/delete/license override), series list, source query library editor, homepage row editor (reorder/rename/toggle), audit log filter, settings (auto-import, auto-publish, frequency, max per run, min duration), health check trigger
- Seeded database with: 20 source queries (mix of YouTube + Wikimedia), 14 homepage rows, default settings singleton, real Wikimedia Commons import (23 items, all license-verified and published — including NASA animations, classic film noir "The Bloody Brood (1959)", "Safety Last (1923)", "Three's A Crowd (1927)", documentaries like "No País das Amazonas" 1922, NASA Hubble25, etc.)
- Verified end-to-end with Agent Browser: home page renders hero with backdrop + content rails; clicking a card opens watch page with real video playing + license panel + attribution; admin dashboard shows real stats; quick URL import successfully fetched metadata + verified license + saved as published; search import returned 9 real Wikimedia results with license badges; bulk discovery correctly identified duplicates

Stage Summary:
- 24 published, license-verified titles live in the demo library
- 3 import jobs logged in audit history; 30 audit log entries
- Production-ready: admin sets YOUTUBE_API_KEY + ADMIN_TOKEN env vars, toggles Auto Import ON in settings, and the system continuously populates itself from the source query library
- Quality and legal verification take priority: content with unverified license is saved as Review Required and is never auto-published

---
Task ID: 2
Agent: main (super-z)
Task: Add "Premium IPTV" module to PlayBeat TV (Xtream Masters reseller API integration)

Work Log:
- Extended Prisma schema with 4 new models: IptvLine, ActiveCode, MacAddress, IptvCreditLog + IPTV fields on Settings
- Built typed Xtream reseller API client at src/lib/xtream/client.ts covering:
  - Account info, credit logs
  - Xtream line CRUD (create/edit/extend/delete with force-refund)
  - ActiveCode CRUD (create with auto-generated 14-digit code + base64 callback support)
  - Mac address CRUD (with format validation 00:AA:BB:CC:DD:11)
  - M3U playlist proxy + parser (parses #EXTINF metadata into structured channel objects)
  - Demo mode fallback when no XTREAM_API_KEY env var is set (returns realistic mock data, simulates writes)
- Added 7 new API routes:
  - GET /api/admin/iptv/status — account info + config status
  - GET /api/admin/iptv/credit-logs — mirrors remote logs to local DB
  - GET/POST /api/admin/iptv/lines — list + create + extend + edit + delete (with audit logging)
  - GET/POST /api/admin/iptv/activecodes — same CRUD pattern
  - GET/POST /api/admin/iptv/macs — same CRUD pattern
  - GET /api/admin/iptv/m3u/[lineId] — proxies the M3U playlist (server-side only, key never exposed)
  - GET /api/iptv/channels — public endpoint returning parsed channel list
  - POST /api/admin/iptv/callback — receives ActiveCode activation events from reseller
- Updated existing endpoints to expose IPTV status: /api/admin/status and /api/admin/import/settings
- Built admin IPTV UI — 5 tabs under a new "IPTV" nav item:
  - Overview: account info (credit balance, total lines, monthly plan, max lines, next renewal) + trial usage progress bar + demo-mode banner
  - Xtream Lines: list with status pills + create form (username/password/plan/bouquet/CONX/notice + channels/VODs/adult flags) + extend/delete actions + reveal-M3U-URL
  - ActiveCodes: list + generate form (auto 14-digit code) + extend/delete + copy-to-clipboard + activated badge
  - Mac Addresses: list + register form (with MAC validation) + extend/delete
  - Credit Logs: table view with date/info/charge/balance, color-coded +/- charges
- Updated Admin Settings page with new "Premium IPTV (reseller) configuration" panel showing XTREAM_API_KEY/XTREAM_SERVER_URL/iptvEnabled status + enable/disable toggle
- Built public Live TV view at /view=live:
  - Header nav gets a new amber-colored "Live TV" link
  - Channel grid with thumbnails, group filter chips, type filter (live/vod/series), search
  - Click a channel → opens Watch view with PlayerAdapter handling the URL (HLS via hls.js, MP4 via native HTML5)
  - Watch page shows amber "premium IPTV channel" notice instead of the public-domain license panel
- Updated Zustand store with new "live" view + "iptv-overview/lines/activecodes/macs/logs" admin views + "channel" watchTarget kind
- Seeded 6 demo IPTV channels (Big Buck Bunny, Sintel, Tears of Steel, Elephant Dream, Demo News 24, For Bigger Joyrides) using public test streams — playable in the sandbox without any reseller API key

Stage Summary:
- Premium IPTV module fully integrated alongside the free legal library — they coexist as two product tiers
- All 3 line types supported: Xtream users, ActiveCodes, Mac addresses
- Demo mode ensures the entire admin UI is explorable without a real reseller account
- Going live requires only: set XTREAM_API_KEY + XTREAM_SERVER_URL env vars, then click "Enable IPTV module" in Admin → Settings
- End-to-end verified with Agent Browser: Live TV grid renders with channel cards, clicking a channel opens the player with amber premium-notice, admin IPTV overview shows demo credit balance (1088.73) and trial usage (7/50), creating a demo line works and shows in the list with ACTIVE status + Extend/Delete buttons
