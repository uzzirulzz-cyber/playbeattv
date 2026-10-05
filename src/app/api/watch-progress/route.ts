import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export const dynamic = "force-dynamic"

const HEADER = "x-pb-user"
function getUserId(req: NextRequest): string | null {
  return req.headers.get(HEADER) || req.headers.get("cookie")?.match(/pb_user=([^;]+)/)?.[1] || null
}

// GET — fetch continue-watching list
export async function GET(req: NextRequest) {
  const userId = getUserId(req)
  if (!userId) return NextResponse.json({ items: [] })
  const items = await db.watchProgress.findMany({
    where: { userId },
    orderBy: { lastWatched: "desc" },
    take: 20,
    include: {
      content: { select: { id: true, title: true, slug: true, poster: true, type: true, duration: true } },
      episode: { select: { id: true, title: true, slug: true, thumbnail: true, seasonNumber: true, episodeNumber: true, seriesId: true, series: { select: { title: true, slug: true } } } },
    },
  })
  return NextResponse.json({
    items: items.map(p => ({
      id: p.id,
      position: p.position,
      duration: p.duration,
      percentage: p.percentage,
      lastWatched: p.lastWatched,
      content: p.content,
      episode: p.episode,
    })),
  })
}

// POST — record / update progress
export async function POST(req: NextRequest) {
  const userId = getUserId(req)
  if (!userId) return NextResponse.json({ error: "user header required" }, { status: 400 })
  const body = await req.json().catch(() => ({}))
  const contentId = body.contentId || null
  const episodeId = body.episodeId || null
  const seriesId = body.seriesId || (episodeId ? (await db.episode.findUnique({ where: { id: episodeId }, select: { seriesId: true } }))?.seriesId : null)
  const position = Math.max(0, parseInt(body.position || "0", 10))
  const duration = Math.max(0, parseInt(body.duration || "0", 10))
  const percentage = duration > 0 ? Math.min(100, Math.round((position / duration) * 100)) : 0

  const data: any = {
    position, duration, percentage,
    lastWatched: new Date(),
  }
  if (contentId) data.contentId = contentId
  if (episodeId) data.episodeId = episodeId
  if (seriesId) data.seriesId = seriesId

  // Try update by unique key — contentId or episodeId
  if (contentId) {
    const existing = await db.watchProgress.findUnique({ where: { userId_contentId: { userId, contentId } } })
    if (existing) {
      await db.watchProgress.update({ where: { id: existing.id }, data })
    } else {
      await db.watchProgress.create({ data: { userId, ...data } })
    }
    // Bump play count
    await db.content.update({ where: { id: contentId }, data: { plays: { increment: 1 } } }).catch(() => {})
    if (percentage >= 95) {
      await db.content.update({ where: { id: contentId }, data: { completions: { increment: 1 } } }).catch(() => {})
    }
  } else if (episodeId) {
    const existing = await db.watchProgress.findUnique({ where: { userId_episodeId: { userId, episodeId } } })
    if (existing) {
      await db.watchProgress.update({ where: { id: existing.id }, data })
    } else {
      await db.watchProgress.create({ data: { userId, ...data } })
    }
    await db.episode.update({ where: { id: episodeId }, data: { plays: { increment: 1 } } }).catch(() => {})
    if (percentage >= 95) {
      await db.episode.update({ where: { id: episodeId }, data: { completions: { increment: 1 } } }).catch(() => {})
    }
    if (seriesId) {
      // Recompute series trending
      const eps = await db.episode.aggregate({
        where: { seriesId },
        _sum: { plays: true, completions: true },
      })
      await db.series.update({
        where: { id: seriesId },
        data: { trendingScore: (eps._sum.plays || 0) + (eps._sum.completions || 0) * 5 },
      }).catch(() => {})
    }
  }

  return NextResponse.json({ ok: true })
}
