import { NextRequest, NextResponse } from "next/server"
import { requireAdmin, getClientIp } from "@/lib/auth/admin"
import { db } from "@/lib/db"
import { importSearch } from "@/lib/import/engine"

export const dynamic = "force-dynamic"
export const maxDuration = 300

// Bulk discovery: runs all enabled SourceQuery rows for the chosen source.
export async function POST(req: NextRequest) {
  const ok = requireAdmin(req)
  if (!ok.ok) return NextResponse.json({ error: ok.reason }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const source = body.source || "youtube"
  const contentType = body.contentType || "all"
  const language = body.language
  const licenseFilter = body.licenseFilter || "all_verified"
  const minDurationSec = body.minDurationSec
  const maxResults = Math.min(parseInt(body.maxResults || "100", 10), 250)

  const ip = getClientIp(req)
  const result = await importSearch({
    source,
    contentType, language, licenseFilter, minDurationSec, maxResults,
    requestedBy: "admin", ip,
  })
  return NextResponse.json(result)
}

// Bulk preview: dry-run search showing discovered items without saving
export async function GET(req: NextRequest) {
  const ok = requireAdmin(req)
  if (!ok.ok) return NextResponse.json({ error: ok.reason }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const source = (searchParams.get("source") || "youtube") as "youtube" | "wikimedia"
  const query = searchParams.get("query") || ""
  const maxResults = Math.min(parseInt(searchParams.get("maxResults") || "25", 10), 50)
  const licenseFilter = searchParams.get("licenseFilter") || "any"

  if (!query) {
    // Return queries from the library
    const queries = await db.sourceQuery.findMany({
      where: { source, enabled: true },
      orderBy: { useCount: "asc" },
    })
    return NextResponse.json({ queries: queries.map(q => q.query), items: [] })
  }

  const { searchYouTubeVideos, searchWikimediaVideos } = await import("@/lib/import/sources")
  const items = source === "youtube"
    ? await searchYouTubeVideos({ query, maxResults, licenseFilter })
    : await searchWikimediaVideos({ query, maxResults })

  return NextResponse.json({
    items: items.map(it => ({
      sourceId: it.sourceId,
      title: it.title,
      description: it.description.slice(0, 200),
      thumbnail: it.thumbnail,
      duration: it.duration,
      license: { type: it.licenseDecision.type, status: it.licenseDecision.status, verified: it.licenseDecision.verified, reason: it.licenseDecision.reason },
      sourceProvider: it.sourceProvider,
      channelTitle: it.channelTitle,
      antiMoviePattern: it.antiMoviePattern,
      originalUrl: it.originalUrl,
    })),
  })
}
