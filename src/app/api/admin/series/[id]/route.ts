import { NextRequest, NextResponse } from "next/server"
import { requireAdmin, getClientIp } from "@/lib/auth/admin"
import { db } from "@/lib/db"
import { jsonStringify } from "@/lib/import/util"

export const dynamic = "force-dynamic"

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const ok = requireAdmin(req)
  if (!ok.ok) return NextResponse.json({ error: ok.reason }, { status: 401 })
  const { id } = await ctx.params
  const body = await req.json().catch(() => ({}))
  const update: any = {}
  for (const k of ["title", "description", "poster", "backdrop", "published", "featured", "trending"]) {
    if (k in body) update[k] = body[k]
  }
  if (body.genres) update.genres = jsonStringify(body.genres)
  if (body.languages) update.languages = jsonStringify(body.languages)
  const updated = await db.series.update({ where: { id }, data: update })
  await db.auditLog.create({
    data: {
      actor: "admin",
      action: "content.edited",
      targetType: "series",
      target: id,
      detail: jsonStringify(update),
      ip: getClientIp(req),
    },
  }).catch(() => {})
  return NextResponse.json({ ok: true, series: updated })
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const ok = requireAdmin(req)
  if (!ok.ok) return NextResponse.json({ error: ok.reason }, { status: 401 })
  const { id } = await ctx.params
  await db.series.delete({ where: { id } })
  await db.auditLog.create({
    data: {
      actor: "admin",
      action: "content.deleted",
      targetType: "series",
      target: id,
      detail: "{}",
      ip: getClientIp(req),
    },
  }).catch(() => {})
  return NextResponse.json({ ok: true })
}
