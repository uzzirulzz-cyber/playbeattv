import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { fetchM3uPlaylist, parseM3u, demoM3uPlaylist, isXtreamConfigured, getServerUrl } from "@/lib/xtream/client"

export const dynamic = "force-dynamic"

// GET /api/iptv/channels?lineId=...&group=...&type=...&q=...
// If no lineId given, picks the most recently created active line.
// Returns parsed channel list. .ts stream URLs are converted to .m3u8
// so the browser can play them via hls.js.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  let lineId = searchParams.get("lineId")
  const group = searchParams.get("group")
  const type = searchParams.get("type") // live | vod | series
  const q = searchParams.get("q")

  let m3u: string
  let lineLabel = "Demo"
  let lineServerUrl: string | null = null
  let isDemo = false

  if (!lineId || lineId === "demo") {
    // Auto-pick the most recent active line if one exists
    const activeLine = await db.iptvLine.findFirst({
      where: { status: "active" },
      orderBy: { createdAt: "desc" },
    })
    if (activeLine) {
      lineId = activeLine.id
      lineLabel = activeLine.username
      lineServerUrl = activeLine.serverUrl
    }
  }

  if (!lineId || lineId === "demo") {
    m3u = demoM3uPlaylist()
    isDemo = true
  } else {
    const line = await db.iptvLine.findUnique({ where: { id: lineId } })
    if (!line || line.status !== "active") {
      m3u = demoM3uPlaylist()
      isDemo = true
    } else {
      lineLabel = line.username
      lineServerUrl = line.serverUrl
      // Resolve server URL: per-line wins, else env
      const serverUrl = line.serverUrl || getServerUrl()
      // We treat "configured" as: serverUrl is set (either on the line or via env).
      // The XTREAM_API_KEY env var is only needed for *reseller* write actions;
      // for *customer-side* M3U fetches, we just need the server URL + line creds.
      if (!serverUrl) {
        m3u = demoM3uPlaylist()
        isDemo = true
      } else {
        const r = await fetchM3uPlaylist(serverUrl, line.username, line.password)
        m3u = r.ok ? r.text : demoM3uPlaylist()
        isDemo = !r.ok
      }
    }
  }

  let channels = parseM3u(m3u)
  // Convert .ts URLs to .m3u8 so the browser can play them via hls.js
  channels = channels.map(c => ({
    ...c,
    url: c.url.endsWith(".ts") ? c.url.replace(/\.ts$/, ".m3u8") : c.url,
  }))

  if (type) channels = channels.filter(c => c.type === type)
  if (group) channels = channels.filter(c => (c.group || "").toLowerCase().includes(group.toLowerCase()))
  if (q) channels = channels.filter(c => c.name.toLowerCase().includes(q.toLowerCase()))

  // Build a grouped structure for the UI
  const groups: Record<string, number> = {}
  for (const c of channels) {
    const g = c.group || "Other"
    groups[g] = (groups[g] || 0) + 1
  }

  return NextResponse.json({
    channels,
    groups: Object.entries(groups).map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name)),
    total: channels.length,
    demo: isDemo,
    lineLabel,
    serverUrl: lineServerUrl,
  })
}
