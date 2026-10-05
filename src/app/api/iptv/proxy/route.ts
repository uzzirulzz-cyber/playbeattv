import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const maxDuration = 300 // allow long-lived stream segments

// Server-side HTTPS proxy for IPTV streams that are HTTP-only or have CORS issues.
//
// Why this exists:
//   1. Mixed content — the site is served over HTTPS in production, but IPTV panels
//      typically stream over HTTP. Browsers block HTTP fetches from HTTPS pages.
//   2. CORS — upstream panels don't return Access-Control-Allow-Origin, so hls.js
//      can't fetch segments directly from the browser even when HTTPS works.
//
// How it works:
//   - The client passes the upstream URL as a query param `u` (URL-encoded).
//   - We fetch it server-side, follow redirects (Xtream load-balancer uses 302),
//     pipe the response through, and add CORS headers.
//   - If the response is an HLS manifest (.m3u8), we rewrite relative and absolute
//     URLs in the manifest to also route through this proxy, so hls.js can resolve
//     segment URLs without hitting the same mixed-content / CORS problem.
//
// Security note:
//   This proxy is intentionally open (any URL can be passed via ?u=...). For a
//   production deployment you'd want to restrict it to known IPTV panel hosts
//   (whitelist of upstream server URLs) to prevent abuse as an open proxy.

const UPSTREAM_TIMEOUT_MS = 20000

export async function GET(req: NextRequest) {
  const u = req.nextUrl.searchParams.get("u")
  if (!u) {
    return NextResponse.json({ error: "missing ?u= parameter" }, { status: 400 })
  }

  let upstreamUrl: string
  try {
    upstreamUrl = decodeURIComponent(u)
  } catch {
    return NextResponse.json({ error: "invalid ?u= encoding" }, { status: 400 })
  }

  // Validate it's a URL we can fetch
  let parsed: URL
  try {
    parsed = new URL(upstreamUrl)
  } catch {
    return NextResponse.json({ error: "invalid upstream URL" }, { status: 400 })
  }
  if (!/^https?:$/.test(parsed.protocol)) {
    return NextResponse.json({ error: "only http(s) upstreams allowed" }, { status: 400 })
  }

  let upstreamRes: Response
  try {
    upstreamRes = await fetch(upstreamUrl, {
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      headers: {
        "User-Agent": "PlayBeatTV/1.0 (HTTPS stream proxy)",
        // Pass through Range header for segment seeking
        ...(req.headers.get("range") ? { Range: req.headers.get("range")! } : {}),
      },
      redirect: "follow", // follow 302 redirects to load-balanced CDN
    })
  } catch (e: any) {
    return NextResponse.json(
      { error: `upstream fetch failed: ${e.message || String(e)}` },
      { status: 502 }
    )
  }

  if (!upstreamRes.ok) {
    return NextResponse.json(
      { error: `upstream ${upstreamRes.status}`, url: upstreamUrl },
      { status: upstreamRes.status }
    )
  }

  // CRITICAL: the URL used as the base for resolving relative URLs in the
  // manifest is the FINAL URL after redirects — not the URL we originally
  // fetched. Xtream's load-balancer does a 302 to a dynamic CDN host
  // (e.g. 951809.voxmachina.space:80), and the segment URLs in the playlist
  // are relative to that host, not to geotv.space:8880.
  const finalUrl = upstreamRes.url || upstreamUrl

  const contentType = upstreamRes.headers.get("content-type") || ""
  const isHlsManifest = contentType.includes("mpegurl") || finalUrl.endsWith(".m3u8")

  // Build response headers — CORS + passthrough of useful ones
  const responseHeaders = new Headers({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "Range",
    "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges",
    "Cache-Control": "no-store",
  })
  if (upstreamRes.headers.get("content-length")) {
    responseHeaders.set("Content-Length", upstreamRes.headers.get("content-length")!)
  }
  if (upstreamRes.headers.get("content-range")) {
    responseHeaders.set("Content-Range", upstreamRes.headers.get("content-range")!)
  }
  if (upstreamRes.headers.get("accept-ranges")) {
    responseHeaders.set("Accept-Ranges", upstreamRes.headers.get("accept-ranges")!)
  }

  // For HLS manifests, rewrite URLs so subsequent fetches also go through the proxy
  if (isHlsManifest) {
    responseHeaders.set("Content-Type", "application/vnd.apple.mpegurl")
    const body = await upstreamRes.text()
    const rewritten = rewriteHlsManifest(body, finalUrl)
    return new NextResponse(rewritten, { status: 200, headers: responseHeaders })
  }

  // For binary segment responses (video/mp2t, video/mp4, etc.) — pipe through
  if (contentType) responseHeaders.set("Content-Type", contentType)
  const buf = Buffer.from(await upstreamRes.arrayBuffer())
  return new NextResponse(new Uint8Array(buf), { status: 200, headers: responseHeaders })
}

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "Range",
      "Access-Control-Max-Age": "86400",
    },
  })
}

// Rewrite an HLS manifest so every URL the browser would fetch next also goes
// through our proxy.
//
// - #EXT-X-KEY:URI="..." → rewrite URI
// - #EXT-X-MAP:URI="..." → rewrite URI
// - Any line that looks like a URL → rewrite
// - Relative URLs → resolve against the playlist's final URL (after redirects),
//   then rewrite to /api/iptv/proxy?u=ENCODED
function rewriteHlsManifest(body: string, finalUpstreamUrl: string): string {
  const lines = body.split(/\r?\n/)
  const proxyBase = `/api/iptv/proxy`
  // The "base URL" for resolving relative URLs in the manifest is the upstream
  // URL we just fetched (which is the final URL after redirects — hls.js would
  // resolve relative URLs against this same base).
  const baseUrl = finalUpstreamUrl

  const rewriteUrl = (raw: string): string => {
    let target: URL
    try {
      target = new URL(raw, baseUrl)
    } catch {
      return raw
    }
    // Only proxy http/https URLs
    if (!/^https?:$/.test(target.protocol)) return raw
    return `${proxyBase}?u=${encodeURIComponent(target.href)}`
  }

  const out = lines.map(line => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) {
      // Rewrite URIs inside tag attributes
      // Match patterns like: URI="..." inside EXT-X-KEY, EXT-X-MAP, EXT-X-MEDIA etc.
      return line.replace(/URI="([^"]+)"/g, (match, uri) => {
        try {
          const target = new URL(uri, baseUrl)
          if (/^https?:$/.test(target.protocol)) {
            return `URI="${proxyBase}?u=${encodeURIComponent(target.href)}"`
          }
        } catch {}
        return match
      })
    }
    // Non-comment line that's not a tag → it's a URL line
    return rewriteUrl(trimmed)
  })

  return out.join("\n")
}
