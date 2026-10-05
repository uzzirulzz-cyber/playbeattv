import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/admin"
import { db } from "@/lib/db"
import { jsonParse } from "@/lib/import/util"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const ok = requireAdmin(req)
  if (!ok.ok) return NextResponse.json({ error: ok.reason }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100)
  const jobs = await db.importJob.findMany({
    orderBy: { startedAt: "desc" },
    take: limit,
    include: { _count: { select: { items: true } } },
  })
  return NextResponse.json({
    jobs: jobs.map(j => ({
      id: j.id,
      status: j.status,
      source: j.source,
      query: j.query,
      contentType: j.contentType,
      licenseFilter: j.licenseFilter,
      maxResults: j.maxResults,
      requestedBy: j.requestedBy,
      startedAt: j.startedAt,
      completedAt: j.completedAt,
      discovered: j.discovered,
      imported: j.imported,
      published: j.published,
      duplicates: j.duplicates,
      rejected: j.rejected,
      reviewRequired: j.reviewRequired,
      errors: j.errors,
      itemCount: j._count.items,
      log: jsonParse<string[]>(j.log, []),
    })),
  })
}
