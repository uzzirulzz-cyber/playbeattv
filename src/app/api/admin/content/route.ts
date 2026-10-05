import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/admin"
import { db } from "@/lib/db"
import { jsonParse, jsonStringify, slugify, buildSeo } from "@/lib/import/util"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const ok = requireAdmin(req)
  if (!ok.ok) return NextResponse.json({ error: ok.reason }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 200)
  const status = searchParams.get("status") // verified | review | rejected
  const type = searchParams.get("type")
  const q = searchParams.get("q")

  const where: any = {}
  if (status) where.licenseStatus = status
  if (type) where.type = type
  if (q) where.title = { contains: q }

  const items = await db.content.findMany({
    where,
    orderBy: { importedAt: "desc" },
    take: limit,
  })
  const series = await db.series.findMany({
    where: q ? { title: { contains: q } } : undefined,
    orderBy: { importedAt: "desc" },
    take: limit,
    include: { _count: { select: { episodes: true } } },
  })
  return NextResponse.json({
    content: items.map(c => ({
      id: c.id, title: c.title, slug: c.slug, type: c.type,
      published: c.published, available: c.available,
      poster: c.poster, releaseYear: c.releaseYear,
      sourceProvider: c.sourceProvider,
      licenseStatus: c.licenseStatus,
      licenseType: c.licenseType,
      trendingScore: c.trendingScore,
      views: c.views, plays: c.plays,
      importedAt: c.importedAt,
    })),
    series: series.map(s => ({
      id: s.id, title: s.title, slug: s.slug,
      published: s.published,
      poster: s.poster,
      sourceProvider: s.sourceProvider,
      episodesCount: s._count?.episodes ?? 0,
      importedAt: s.importedAt,
    })),
  })
}
