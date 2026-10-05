import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { jsonParse } from "@/lib/import/util"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get("type") || undefined
  const genre = searchParams.get("genre") || undefined
  const language = searchParams.get("language") || undefined
  const limit = Math.min(parseInt(searchParams.get("limit") || "24", 10), 100)
  const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10), 0)
  const sort = searchParams.get("sort") || "recent"

  const where: any = { published: true, available: true }
  if (type && type !== "all") where.type = type
  if (genre && genre !== "all") where.genres = { contains: `"${genre}"` }
  if (language && language !== "all") where.languages = { contains: `"${language}"` }

  let orderBy: any = { importedAt: "desc" }
  if (sort === "trending") orderBy = { trendingScore: "desc" }
  if (sort === "popular") orderBy = { views: "desc" }
  if (sort === "featured") { where.featured = true; orderBy = { trendingScore: "desc" } }

  const items = await db.content.findMany({ where, orderBy, take: limit, skip: offset })

  const seriesWhere: any = { published: true }
  if (genre && genre !== "all") seriesWhere.genres = { contains: `"${genre}"` }
  if (language && language !== "all") seriesWhere.languages = { contains: `"${language}"` }
  let series: any[] = []
  if (!type || type === "all" || type === "series") {
    let seriesOrder: any = { trendingScore: "desc" }
    if (sort === "recent") seriesOrder = { importedAt: "desc" }
    series = await db.series.findMany({
      where: seriesWhere,
      orderBy: seriesOrder,
      take: type === "series" ? limit : Math.min(limit, 8),
      skip: type === "series" ? offset : 0,
      include: { _count: { select: { episodes: true } } },
    })
  }

  return NextResponse.json({
    content: items.map(serializeContent),
    series: series.map(serializeSeries),
    pagination: { limit, offset, hasMore: items.length === limit },
  })
}

function serializeContent(c: any) {
  return {
    id: c.id, title: c.title, slug: c.slug, type: c.type,
    description: c.description,
    poster: c.poster, backdrop: c.backdrop,
    releaseYear: c.releaseYear, duration: c.duration,
    genres: jsonParse<string[]>(c.genres, []),
    languages: jsonParse<string[]>(c.languages, []),
    country: c.country, ageRating: c.ageRating,
    featured: c.featured, trending: c.trending,
    source: {
      provider: c.sourceProvider, sourceId: c.sourceId,
      originalUrl: c.originalUrl, embedUrl: c.embedUrl, streamUrl: c.streamUrl,
    },
    license: {
      type: c.licenseType, verified: c.licenseVerified,
      status: c.licenseStatus, attribution: c.licenseAttribution,
      sourceUrl: c.licenseSourceUrl,
    },
    trendingScore: c.trendingScore,
    views: c.views, plays: c.plays,
    seo: jsonParse(c.seoJson, {}),
    importedAt: c.importedAt,
  }
}
function serializeSeries(s: any) {
  return {
    id: s.id, title: s.title, slug: s.slug,
    description: s.description,
    poster: s.poster, backdrop: s.backdrop,
    genres: jsonParse<string[]>(s.genres, []),
    languages: jsonParse<string[]>(s.languages, []),
    sourceProvider: s.sourceProvider, sourceChannel: s.sourceChannel,
    featured: s.featured, trending: s.trending,
    trendingScore: s.trendingScore,
    episodesCount: s._count?.episodes ?? 0,
    seo: jsonParse(s.seoJson, {}),
    importedAt: s.importedAt,
  }
}
