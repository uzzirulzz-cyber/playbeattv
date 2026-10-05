import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { jsonParse } from "@/lib/import/util"

export const dynamic = "force-dynamic"

export async function GET(_req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  const c = await db.content.findUnique({ where: { slug } })
  if (!c || !c.published) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  // increment views (fire and forget)
  db.content.update({ where: { id: c.id }, data: { views: { increment: 1 } } }).catch(() => {})
  return NextResponse.json({
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
      sourceUrl: c.licenseSourceUrl, checkedAt: c.licenseCheckedAt,
    },
    views: c.views, plays: c.plays, trendingScore: c.trendingScore,
    seo: jsonParse(c.seoJson, {}),
    importedAt: c.importedAt,
    updatedAt: c.updatedAt,
  })
}
