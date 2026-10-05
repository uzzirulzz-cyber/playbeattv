import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { jsonParse } from "@/lib/import/util"

export const dynamic = "force-dynamic"

export async function GET(_req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  const s = await db.series.findUnique({
    where: { slug },
    select: { id: true, title: true, slug: true },
  })
  if (!s) return NextResponse.json({ error: "Not found" }, { status: 404 })
  const episodes = await db.episode.findMany({
    where: { seriesId: s.id, published: true },
    orderBy: [{ seasonNumber: "asc" }, { episodeNumber: "asc" }],
  })
  return NextResponse.json({
    series: { id: s.id, title: s.title, slug: s.slug },
    episodes: episodes.map(ep => ({
      id: ep.id,
      episodeNumber: ep.episodeNumber,
      seasonNumber: ep.seasonNumber,
      title: ep.title, slug: ep.slug, description: ep.description,
      duration: ep.duration, thumbnail: ep.thumbnail,
      source: { provider: ep.sourceProvider, sourceId: ep.sourceId, originalUrl: ep.originalUrl, embedUrl: ep.embedUrl, streamUrl: ep.streamUrl },
      license: { type: ep.licenseType, status: ep.licenseStatus, attribution: ep.licenseAttribution },
    })),
  })
}
