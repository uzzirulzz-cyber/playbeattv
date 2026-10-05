import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { jsonParse } from "@/lib/import/util"

export const dynamic = "force-dynamic"

// Simple "user" — generate a stable browser-side ID stored in localStorage.
// (No real auth in this demo; production would tie to a logged-in session.)
const HEADER = "x-pb-user"

function getUserId(req: NextRequest): string | null {
  return req.headers.get(HEADER) || req.headers.get("cookie")?.match(/pb_user=([^;]+)/)?.[1] || null
}

export async function GET(req: NextRequest) {
  const userId = getUserId(req)
  if (!userId) return NextResponse.json({ items: [] })
  const items = await db.watchlistItem.findMany({
    where: { userId },
    orderBy: { addedAt: "desc" },
    include: {
      content: { select: { id: true, title: true, slug: true, poster: true, type: true, releaseYear: true, duration: true } },
      series: { select: { id: true, title: true, slug: true, poster: true } },
      episode: { select: { id: true, title: true, slug: true, thumbnail: true, seasonNumber: true, episodeNumber: true, seriesId: true, series: { select: { title: true, slug: true } } } },
    },
  })
  return NextResponse.json({
    items: items.map(i => ({
      id: i.id,
      addedAt: i.addedAt,
      content: i.content,
      series: i.series,
      episode: i.episode,
    })),
  })
}

export async function POST(req: NextRequest) {
  const userId = getUserId(req)
  if (!userId) return NextResponse.json({ error: "user header required" }, { status: 400 })
  const body = await req.json().catch(() => ({}))
  // Add
  if (body.action === "add") {
    const existing = await db.watchlistItem.findFirst({
      where: {
        userId,
        contentId: body.contentId || null,
        seriesId: body.seriesId || null,
        episodeId: body.episodeId || null,
      },
    })
    if (existing) return NextResponse.json({ ok: true, duplicate: true })
    const item = await db.watchlistItem.create({
      data: {
        userId,
        contentId: body.contentId || null,
        seriesId: body.seriesId || null,
        episodeId: body.episodeId || null,
      },
    })
    if (body.contentId) {
      await db.content.update({ where: { id: body.contentId }, data: { favorites: { increment: 1 } } }).catch(() => {})
    }
    return NextResponse.json({ ok: true, item })
  }
  // Remove
  if (body.action === "remove") {
    await db.watchlistItem.deleteMany({
      where: {
        userId,
        id: body.itemId,
      },
    })
    if (body.contentId) {
      await db.content.update({ where: { id: body.contentId }, data: { favorites: { decrement: 1 } } }).catch(() => {})
    }
    return NextResponse.json({ ok: true })
  }
  return NextResponse.json({ error: "unknown action" }, { status: 400 })
}
