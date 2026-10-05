import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/admin"
import { db } from "@/lib/db"
import { jsonParse } from "@/lib/import/util"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const ok = requireAdmin(req)
  if (!ok.ok) return NextResponse.json({ error: ok.reason }, { status: 401 })

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const [
    totalContent, totalSeries, totalEpisodes,
    publishedContent, reviewContent, rejectedContent,
    importsToday, licenseVerified,
    jobErrors, jobsToday,
  ] = await Promise.all([
    db.content.count(),
    db.series.count(),
    db.episode.count(),
    db.content.count({ where: { published: true } }),
    db.content.count({ where: { licenseStatus: "review" } }),
    db.content.count({ where: { licenseStatus: "rejected" } }),
    db.importJob.count({ where: { startedAt: { gte: todayStart } } }),
    db.content.count({ where: { licenseVerified: true } }),
    db.importJob.count({ where: { status: "failed" } }),
    db.importJob.count({ where: { startedAt: { gte: todayStart } } }),
  ])

  // Aggregates from import jobs in the last 24h
  const since = new Date(now.getTime() - 24 * 3600 * 1000)
  const recentJobs = await db.importJob.findMany({
    where: { startedAt: { gte: since } },
    select: { discovered: true, imported: true, published: true, duplicates: true, rejected: true, reviewRequired: true, errors: true },
  })
  const sums = recentJobs.reduce((a, j) => ({
    discovered: a.discovered + j.discovered,
    imported: a.imported + j.imported,
    published: a.published + j.published,
    duplicates: a.duplicates + j.duplicates,
    rejected: a.rejected + j.rejected,
    reviewRequired: a.reviewRequired + j.reviewRequired,
    errors: a.errors + j.errors,
  }), { discovered: 0, imported: 0, published: 0, duplicates: 0, rejected: 0, reviewRequired: 0, errors: 0 })

  // Source breakdown
  const bySource = await db.content.groupBy({
    by: ["sourceProvider"],
    _count: { _all: true },
  })

  return NextResponse.json({
    content: { total: totalContent, published: publishedContent, review: reviewContent, rejected: rejectedContent },
    series: { total: totalSeries },
    episodes: { total: totalEpisodes },
    imports: {
      jobsToday,
      importsToday: importsToday,
      errors: jobErrors,
      last24h: sums,
    },
    license: {
      verified: licenseVerified,
      review: reviewContent,
      rejected: rejectedContent,
    },
    bySource: bySource.map(s => ({ provider: s.sourceProvider, count: s._count._all })),
    youtube: {
      apiKeyConfigured: !!process.env.YOUTUBE_API_KEY,
    },
    auth: {
      configured: !!process.env.ADMIN_TOKEN || !!process.env.ADMIN_PASSWORD,
    },
  })
}
