import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { jsonParse } from "@/lib/import/util"

export const dynamic = "force-dynamic"

export async function GET(_req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  const s = await db.series.findUnique({
    where: { slug },
    include: {
      seasons: {
        orderBy: { seasonNumber: "asc" },
        include: {
          episodes: {
            orderBy: { episodeNumber: "asc" },
          },
        },
      },
    },
  })
  if (!s || !s.published) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  return NextResponse.json({
    id: s.id, title: s.title, slug: s.slug,
    description: s.description,
    poster: s.poster, backdrop: s.backdrop,
    genres: jsonParse<string[]>(s.genres, []),
    languages: jsonParse<string[]>(s.languages, []),
    sourceProvider: s.sourceProvider, sourceChannel: s.sourceChannel,
    featured: s.featured, trending: s.trending,
    trendingScore: s.trendingScore,
    seo: jsonParse(s.seoJson, {}),
    seasons: s.seasons.map(season => ({
      id: season.id, seasonNumber: season.seasonNumber,
      title: season.title, poster: season.poster,
      description: season.description,
      episodes: season.episodes.map(ep => ({
        id: ep.id, episodeNumber: ep.episodeNumber,
        seasonNumber: ep.seasonNumber,
        title: ep.title, slug: ep.slug, description: ep.description,
        duration: ep.duration, thumbnail: ep.thumbnail,
        source: { provider: ep.sourceProvider, sourceId: ep.sourceId, originalUrl: ep.originalUrl, embedUrl: ep.embedUrl, streamUrl: ep.streamUrl },
        license: { type: ep.licenseType, verified: ep.licenseVerified, status: ep.licenseStatus, attribution: ep.licenseAttribution, sourceUrl: ep.licenseSourceUrl },
        published: ep.published, available: ep.available,
        views: ep.views, plays: ep.plays,
      })),
    })),
  })
}
