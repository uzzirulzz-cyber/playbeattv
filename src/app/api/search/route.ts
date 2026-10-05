import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { jsonParse } from "@/lib/import/util"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = (searchParams.get("q") || "").trim()
  const limit = Math.min(parseInt(searchParams.get("limit") || "10", 10), 50)

  if (!q) return NextResponse.json({ content: [], series: [], episodes: [] })

  // Search across content
  const content = await db.content.findMany({
    where: {
      published: true,
      OR: [
        { title: { contains: q } },
        { description: { contains: q } },
        { genres: { contains: q } },
      ],
    },
    take: limit,
    orderBy: { trendingScore: "desc" },
  })
  // Search across series
  const series = await db.series.findMany({
    where: {
      published: true,
      OR: [
        { title: { contains: q } },
        { description: { contains: q } },
        { genres: { contains: q } },
      ],
    },
    take: limit,
    orderBy: { trendingScore: "desc" },
    include: { _count: { select: { episodes: true } } },
  })
  // Search across episodes
  const episodes = await db.episode.findMany({
    where: {
      published: true,
      OR: [
        { title: { contains: q } },
        { description: { contains: q } },
      ],
    },
    take: limit,
    include: { series: { select: { title: true, slug: true } } },
  })

  return NextResponse.json({
    content: content.map(c => ({
      id: c.id, title: c.title, slug: c.slug, type: c.type,
      poster: c.poster, releaseYear: c.releaseYear, duration: c.duration,
      genres: jsonParse<string[]>(c.genres, []),
      license: { status: c.licenseStatus, type: c.licenseType },
    })),
    series: series.map(s => ({
      id: s.id, title: s.title, slug: s.slug,
      poster: s.poster, episodesCount: s._count?.episodes ?? 0,
      genres: jsonParse<string[]>(s.genres, []),
    })),
    episodes: episodes.map(ep => ({
      id: ep.id, title: ep.title, episodeNumber: ep.episodeNumber,
      seasonNumber: ep.seasonNumber, thumbnail: ep.thumbnail,
      series: ep.series,
    })),
  })
}
