# Project Worklog — IPTV Player (Xtream Codes)

Project: Next.js 16 IPTV player web app.
Playlist provided: username `FHHNUEH`, password `2HSJRV6`, DNS `http://njqqh.mor-esp.cc`.

---
Task ID: 1-7
Agent: main (Z.ai Code)
Task: Build a complete IPTV player web app from the provided Xtream playlist credentials (username FHHNUEH, password 2HSJRV6, DNS http://njqqh.mor-esp.cc, Smarters DNS http://njqqh.phonka.net).

Work Log:
- Installed hls.js for browser HLS playback.
- Designed Prisma schema: Playlist, Favorite (unique streamId+type+playlist), History (upsert on progress). Pushed to SQLite.
- Built server-side Xtream helper (src/lib/xtream.ts): auth, live/vod/series categories & streams, series_info, stream URL builder. ensureDefaultPlaylist seeds the provided credentials.
- Built API routes: /api/xtream (action proxy), /api/playlists (CRUD + active), /api/playlists/test (connection test + sync), /api/favorites (CRUD), /api/history (upsert + clear).
- Client stream-URL builder + Xtream->MediaItem converters (src/lib/xtream-client.ts) so the browser builds playable URLs from the active playlist creds.
- Zustand store (view, category, search, player, series-detail, settings) + React Query + next-themes providers. Default dark theme with emerald accent.
- Components: sidebar (desktop + mobile Sheet drawer), topbar (search, live connection badge, theme toggle), content-card (poster, type badge, rating, hover play, favorite heart), content-grid (skeletons + pagination), category-rail (chips with counts), browser-view (live/movie/series with client-side filter + Load more), home-view (hero + account stats + continue watching + quick links), favorites-view (type tabs), history-view (clear all), player-modal (hls.js + native HLS, loading/error/retry, fullscreen, Esc/F shortcuts, history tracking), series-detail dialog (seasons tabs + episode list + metadata), settings-dialog (edit/test playlist, add playlist, device-setup tab with primary + Smarters DNS + tutorials).
- Lint clean (0 errors, 0 warnings). Reduced Prisma log noise.

Stage Summary:
- App renders at / and connects to the REAL Xtream server. Account is Active, expires 7/13/2026, 0/1 connections.
- Live TV: 100+ categories with real channel counts; category filtering + search + pagination all work.
- Player: clicked a live channel -> HLS stream ACTUALLY PLAYED (readyState 4, paused false, currentTime advancing, no error). hls.js via MSE blob URL.
- Favorites: heart toggle persisted to DB and appears in Favorites view.
- Series: detail dialog loads seasons tabs + episode list from series_info endpoint.
- Settings: editable credentials, Test Connection, Device Setup tab showing http://njqqh.mor-esp.cc (primary) and http://njqqh.phonka.net (Samsung/LG Smarters) with copy buttons.
- Mobile responsive (390px) with drawer menu; sticky footer confirmed at document bottom.
- No console or dev-log errors.

---
Task ID: 8
Agent: main (Z.ai Code)
Task: Integrate Google AdSense (publisher pub-8143075550797983) into HypoTV.

Work Log:
- Created src/lib/ads.ts with ADSENSE_CLIENT = "ca-pub-8143075550797983" + global Window.adsbygoogle type.
- Added AdSense loader script in layout <head> (plain async <script> with crossorigin="anonymous") — avoided next/script because its data-nscript attribute triggered an AdSense console warning.
- Built reusable AdUnit component (src/components/iptv/ad-unit.tsx): renders <ins class="adsbygoogle"> with data-ad-client/format/slot/responsive, pushes (window.adsbygoogle||[]).push({}) once per mount (guarded against React strict-mode double-invoke). Subtle dashed "Advertisement"/"Sponsored" placeholder shows through when no ad fills (dev/preview).
- Built AdBanner (responsive horizontal leaderboard) and AdInFeed (full-width col-span-full in-grid ad) wrappers in src/components/iptv/ads.tsx.
- Updated ContentGrid to accept injectAdsEvery and insert an AdInFeed after every N items (default 24).
- Placed ads across all views: Home (banner after Browse cards), Live TV / Movies / Series (banner below category rail + in-feed every 24 items), Favorites (banner + in-feed), History (banner + in-feed).
- Lint clean. Verified via Agent Browser: AdSense script loads, ad <ins> tags carry correct client ID, banner (~960x92 desktop, ~358x392 mobile responsive) and in-feed "Sponsored" slots render without breaking the grid. No console errors/warnings. /ads.txt still HTTP 200.

Stage Summary:
- AdSense fully wired: script + ads.txt + manual ad units (banner + in-feed) across all browse views.
- Real ads will fill once the domain is approved in the AdSense dashboard; until then labeled placeholders keep the layout intentional.
- No impact on existing streaming functionality; no console errors.
