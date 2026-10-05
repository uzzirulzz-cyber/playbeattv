import { NextRequest, NextResponse } from "next/server"
import { requireAdmin, getClientIp } from "@/lib/auth/admin"
import { db } from "@/lib/db"
import { jsonStringify } from "@/lib/import/util"

export const dynamic = "force-dynamic"

// List series with edit info
export async function GET(req: NextRequest) {
  const ok = requireAdmin(req)
  if (!ok.ok) return NextResponse.json({ error: ok.reason }, { status: 401 })
  const series = await db.series.findMany({
    orderBy: { importedAt: "desc" },
    include: {
      seasons: { orderBy: { seasonNumber: "asc" } },
      _count: { select: { episodes: true } },
    },
  })
  return NextResponse.json({
    series: series.map(s => ({
      id: s.id,
      title: s.title,
      slug: s.slug,
      description: s.description,
      poster: s.poster,
      published: s.published,
      sourceProvider: s.sourceProvider,
      sourceChannel: s.sourceChannel,
      seasonsCount: s.seasons.length,
      episodesCount: s._count.episodes,
      seasons: s.seasons.map(se => ({ id: se.id, seasonNumber: se.seasonNumber, title: se.title })),
      importedAt: s.importedAt,
    })),
  })
}
