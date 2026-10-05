import { NextRequest, NextResponse } from "next/server"
import { requireAdmin, getClientIp } from "@/lib/auth/admin"
import { importSearch } from "@/lib/import/engine"

export const dynamic = "force-dynamic"
export const maxDuration = 300 // 5 min — long-running batch

export async function POST(req: NextRequest) {
  const ok = requireAdmin(req)
  if (!ok.ok) return NextResponse.json({ error: ok.reason }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const source = body.source || "youtube"
  const query = body.query
  const contentType = body.contentType || "all"
  const language = body.language
  const licenseFilter = body.licenseFilter || "any"
  const minDurationSec = body.minDurationSec
  const maxResults = Math.min(parseInt(body.maxResults || "25", 10), 250)

  // If a direct query was given, persist it as a one-off SourceQuery for visibility
  if (query) {
    try {
      const { db } = await import("@/lib/db")
      await db.sourceQuery.create({
        data: { query, source, enabled: true },
      })
    } catch {}
  }

  const ip = getClientIp(req)
  const result = await importSearch({
    source,
    contentType, language, licenseFilter, minDurationSec, maxResults,
    requestedBy: "admin", ip,
  })
  return NextResponse.json(result)
}
