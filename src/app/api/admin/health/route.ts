import { NextRequest, NextResponse } from "next/server"
import { requireAdmin, getClientIp } from "@/lib/auth/admin"
import { db } from "@/lib/db"
import { updateTrendingScore } from "@/lib/import/engine"

export const dynamic = "force-dynamic"

// Trigger a content health check (limited to a small batch for demo)
export async function POST(req: NextRequest) {
  const ok = requireAdmin(req)
  if (!ok.ok) return NextResponse.json({ error: ok.reason }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const limit = Math.min(parseInt(body.limit || "20", 10), 100)
  const items = await db.content.findMany({
    where: { available: true },
    take: limit,
    orderBy: { updatedAt: "asc" },
    select: { id: true, sourceProvider: true, sourceId: true, originalUrl: true, embedUrl: true, streamUrl: true, poster: true, licenseType: true },
  })
  const results: any[] = []
  for (const it of items) {
    let available = true
    let reason = "ok"
    try {
      if (it.sourceProvider === "youtube" && it.sourceId) {
        // Use oEmbed endpoint (no API key needed)
        const r = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${it.sourceId}&format=json`, {
          signal: AbortSignal.timeout(8000),
        })
        if (!r.ok) {
          available = false
          reason = `youtube oembed ${r.status}`
        }
      } else if (it.sourceProvider === "wikimedia" && it.originalUrl) {
        const r = await fetch(it.originalUrl, { method: "HEAD", signal: AbortSignal.timeout(8000) })
        if (!r.ok) {
          available = false
          reason = `wikimedia HEAD ${r.status}`
        }
      } else if (it.streamUrl) {
        const r = await fetch(it.streamUrl, { method: "HEAD", signal: AbortSignal.timeout(8000) })
        if (!r.ok) {
          available = false
          reason = `stream HEAD ${r.status}`
        }
      }
    } catch (e: any) {
      available = false
      reason = e.message || String(e)
    }
    if (!available) {
      await db.content.update({ where: { id: it.id }, data: { available: false } }).catch(() => {})
      await db.auditLog.create({
        data: {
          actor: "system",
          action: "source.changed",
          targetType: "content",
          target: it.id,
          detail: JSON.stringify({ reason }),
          ip: getClientIp(req),
        },
      }).catch(() => {})
    }
    results.push({ id: it.id, available, reason })
  }
  return NextResponse.json({ checked: results.length, results })
}
