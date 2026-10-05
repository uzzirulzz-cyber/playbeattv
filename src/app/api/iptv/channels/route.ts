import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { fetchM3uPlaylist, parseM3u, demoM3uPlaylist, isXtreamConfigured, getServerUrl } from "@/lib/xtream/client"

export const dynamic = "force-dynamic"

// GET /api/iptv/channels?lineId=...&group=...&type=...&q=...
// Returns parsed channel list for the given line (or demo if not configured)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lineId = searchParams.get("lineId") || "demo"
  const group = searchParams.get("group")
  const type = searchParams.get("type") // live | vod | series
  const q = searchParams.get("q")

  let m3u: string

  if (lineId === "demo" || !isXtreamConfigured()) {
    m3u = demoM3uPlaylist()
  } else {
    const line = await db.iptvLine.findUnique({ where: { id: lineId } })
    if (!line || line.status !== "active") {
      // Fall back to demo for any invalid request
      m3u = demoM3uPlaylist()
    } else {
      const serverUrl = getServerUrl()
      if (!serverUrl) {
        m3u = demoM3uPlaylist()
      } else {
        const r = await fetchM3uPlaylist(serverUrl, line.username, line.password)
        m3u = r.ok ? r.text : demoM3uPlaylist()
      }
    }
  }

  let channels = parseM3u(m3u)
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
    demo: lineId === "demo" || !isXtreamConfigured(),
  })
}
