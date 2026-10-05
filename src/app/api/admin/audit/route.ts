import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/admin"
import { db } from "@/lib/db"
import { jsonParse } from "@/lib/import/util"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const ok = requireAdmin(req)
  if (!ok.ok) return NextResponse.json({ error: ok.reason }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 200)
  const action = searchParams.get("action")
  const where: any = action ? { action } : {}
  const logs = await db.auditLog.findMany({
    where,
    orderBy: { timestamp: "desc" },
    take: limit,
  })
  return NextResponse.json({
    logs: logs.map(l => ({
      id: l.id,
      actor: l.actor,
      action: l.action,
      targetType: l.targetType,
      target: l.target,
      detail: jsonParse(l.detail, {}),
      ip: l.ip,
      jobId: l.jobId,
      contentId: l.contentId,
      episodeId: l.episodeId,
      timestamp: l.timestamp,
    })),
  })
}
