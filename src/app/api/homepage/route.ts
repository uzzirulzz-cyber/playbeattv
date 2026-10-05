import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { jsonParse } from "@/lib/import/util"

export const dynamic = "force-dynamic"

export async function GET() {
  const rows = await db.homepageRow.findMany({
    where: { enabled: true },
    orderBy: { order: "asc" },
  })

  const out: any[] = []
  for (const row of rows) {
    const filter = jsonParse<any>(row.filterJson, {})
    let items: any[] = []
    let itemIds: string[] = []
    if (row.filterType === "manual_content") {
      itemIds = jsonParse<string[]>(row.itemIds, [])
      const cs = await db.content.findMany({
        where: { id: { in: itemIds }, published: true },
        take: 24,
      })
      items = cs.map(serializeContent)
    } else if (row.filterType === "manual_series") {
      itemIds = jsonParse<string[]>(row.itemIds, [])
      const ss = await db.series.findMany({
        where: { id: { in: itemIds }, published: true },
        take: 24,
        include: { _count: { select: { episodes: true } } },
      })
      items = ss.map(serializeSeries)
    } else {
      // dynamic — apply filter
      const f = filter || {}
      if (row.key === "featured") {
        // Try featured:true first; if none, fall back to trending items
        let cs = await db.content.findMany({
          where: { featured: true, published: true, available: true },
          orderBy: { trendingScore: "desc" },
          take: f.limit || 12,
        })
        if (cs.length === 0) {
          cs = await db.content.findMany({
            where: { published: true, available: true },
            orderBy: [{ trendingScore: "desc" }, { importedAt: "desc" }],
            take: f.limit || 12,
          })
        }
        items = cs.map(serializeContent)
      } else if (row.key === "trending_now") {
        const cs = await db.content.findMany({
          where: { published: true, available: true },
          orderBy: [{ trendingScore: "desc" }, { importedAt: "desc" }],
          take: f.limit || 12,
        })
        items = cs.map(serializeContent)
      } else if (row.key === "recently_added") {
        const cs = await db.content.findMany({
          where: { published: true, available: true },
          orderBy: { importedAt: "desc" },
          take: f.limit || 12,
        })
        items = cs.map(serializeContent)
      } else if (row.key === "free_movies") {
        const cs = await db.content.findMany({
          where: { published: true, available: true, type: "movie" },
          orderBy: { trendingScore: "desc" },
          take: f.limit || 12,
        })
        items = cs.map(serializeContent)
      } else if (row.key === "web_series" || row.key === "series") {
        const ss = await db.series.findMany({
          where: { published: true },
          orderBy: { trendingScore: "desc" },
          take: f.limit || 12,
          include: { _count: { select: { episodes: true } } },
        })
        items = ss.map(serializeSeries)
      } else if (row.key === "new_episodes") {
        const eps = await db.episode.findMany({
          where: { published: true },
          orderBy: { importedAt: "desc" },
          take: f.limit || 12,
          include: { series: { select: { title: true, slug: true } } },
        })
        items = eps.map(ep => ({
          id: ep.id,
          title: ep.title,
          slug: ep.slug,
          type: "episode",
          thumbnail: ep.thumbnail,
          poster: ep.thumbnail,
          backdrop: ep.thumbnail,
          seasonNumber: ep.seasonNumber,
          episodeNumber: ep.episodeNumber,
          duration: ep.duration,
          series: ep.series,
        }))
      } else {
        // generic genre/type filter
        const where: any = { published: true, available: true }
        if (f.type) where.type = f.type
        if (f.genre) where.genres = { contains: `"${f.genre}"` }
        if (f.language) where.languages = { contains: `"${f.language}"` }
        const cs = await db.content.findMany({
          where,
          orderBy: f.sort === "trending" ? { trendingScore: "desc" } : { importedAt: "desc" },
          take: f.limit || 12,
        })
        items = cs.map(serializeContent)
      }
    }
    out.push({
      id: row.id,
      key: row.key,
      title: row.title,
      enabled: row.enabled,
      order: row.order,
      filterType: row.filterType,
      items,
    })
  }
  return NextResponse.json({ rows: out })
}

function serializeContent(c: any) {
  return {
    id: c.id, title: c.title, slug: c.slug, type: c.type,
    description: c.description, poster: c.poster, backdrop: c.backdrop,
    releaseYear: c.releaseYear, duration: c.duration,
    genres: jsonParse<string[]>(c.genres, []),
    languages: jsonParse<string[]>(c.languages, []),
    source: { provider: c.sourceProvider, embedUrl: c.embedUrl, streamUrl: c.streamUrl },
    license: { status: c.licenseStatus, type: c.licenseType, attribution: c.licenseAttribution },
    trendingScore: c.trendingScore,
    featured: c.featured, trending: c.trending,
  }
}
function serializeSeries(s: any) {
  return {
    id: s.id, title: s.title, slug: s.slug,
    description: s.description,
    poster: s.poster, backdrop: s.backdrop,
    genres: jsonParse<string[]>(s.genres, []),
    languages: jsonParse<string[]>(s.languages, []),
    sourceProvider: s.sourceProvider,
    sourceChannel: s.sourceChannel,
    episodesCount: s._count?.episodes ?? 0,
    type: "series",
    featured: s.featured, trending: s.trending,
    trendingScore: s.trendingScore,
  }
}
