import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { parseM3u, fetchM3uFromUrl } from "@/lib/m3u"

export const dynamic = "force-dynamic"
export const maxDuration = 60

// POST /api/import/m3u — parse M3U text or fetch from URL, return preview
// Body: { text?: string, url?: string }
// Returns: { channels: ParsedChannel[], source: "text" | "url", error?: string }
export async function POST(req: NextRequest) {
  const ok = requireAdmin(req)
  if (!ok.ok) return NextResponse.json({ error: ok.reason }, { status: 401 })
  const body = await req.json().catch(() => ({}))

  const text = body.text as string | undefined
  const url = body.url as string | undefined

  if (!text && !url) {
    return NextResponse.json({ error: "Either 'text' or 'url' is required" }, { status: 400 })
  }

  let m3uText: string
  let source: "text" | "url"
  let fetchError: string | undefined

  if (text) {
    m3uText = text
    source = "text"
  } else {
    source = "url"
    const r = await fetchM3uFromUrl(url!)
    if (!r.ok) {
      return NextResponse.json({
        error: `Failed to fetch URL: ${r.error}`,
        channels: [],
        source,
      }, { status: 502 })
    }
    m3uText = r.text
  }

  const channels = parseM3u(m3uText)

  // Build a category summary for the UI
  const categories: Record<string, number> = {}
  for (const c of channels) {
    const g = c.category || "Uncategorized"
    categories[g] = (categories[g] || 0) + 1
  }

  return NextResponse.json({
    channels,
    source,
    total: channels.length,
    categories: Object.entries(categories)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
  })
}
