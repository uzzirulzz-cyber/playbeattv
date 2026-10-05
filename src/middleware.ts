import { NextRequest, NextResponse } from "next/server"

// Lightweight middleware: add a Content-Security-Policy header that allows
// the browser to upgrade HTTP subresource requests to HTTPS automatically.
// This is defense-in-depth on top of the explicit /api/iptv/proxy route —
// hls.js + the proxy are the primary fix; this header catches any remaining
// HTTP image/font/iframe refs that might slip through.
//
// We're permissive on purpose: the PlayBeat TV app loads images from
// arbitrary upload.wikimedia.org + img-cdn.curl.pk hosts, embeds YouTube
// iframes, and proxies video through our own /api/iptv/proxy. A strict CSP
// would break those — we focus on the two highest-impact directives.

export function middleware(_req: NextRequest) {
  const res = NextResponse.next()
  res.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "img-src 'self' data: https: http:", // allow channel logos from HTTP (panel CDN)
      // hls.js creates blob: URLs via MediaSource API, so media-src must include blob:
      "media-src 'self' blob: https: http:",
      "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.youtube.com https://s.ytimg.com",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",
      // hls.js fetches manifests + segments through our proxy AND uses blob: for MediaSource
      "connect-src 'self' blob: https: http:",
      "upgrade-insecure-requests", // auto-upgrade HTTP→HTTPS where the upstream supports it
    ].join("; ")
  )
  return res
}

export const config = {
  // Skip middleware for /api/iptv/proxy itself (it needs raw CORS control)
  // and for /_next/static (immutable static assets).
  matcher: ["/((?!api/iptv/proxy|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
}
