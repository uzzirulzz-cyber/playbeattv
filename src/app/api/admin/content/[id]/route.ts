import { NextRequest, NextResponse } from "next/server"
import { requireAdmin, getClientIp } from "@/lib/auth/admin"
import { db } from "@/lib/db"
import { jsonParse, jsonStringify, slugify, buildSeo } from "@/lib/import/util"

export const dynamic = "force-dynamic"

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const ok = requireAdmin(req)
  if (!ok.ok) return NextResponse.json({ error: ok.reason }, { status: 401 })
  const { id } = await ctx.params
  const body = await req.json().catch(() => ({}))
  const update: any = {}
  for (const k of ["title", "description", "poster", "backdrop", "releaseYear", "duration", "country", "ageRating", "featured", "trending", "published", "available"]) {
    if (k in body) update[k] = body[k]
  }
  if (body.genres) update.genres = jsonStringify(body.genres)
  if (body.languages) update.languages = jsonStringify(body.languages)
  if (body.type) update.type = body.type
  if (body.title) {
    // Don't change slug automatically — keep stable URLs
  }
  if (body.licenseStatus) {
    update.licenseStatus = body.licenseStatus
    update.licenseVerified = body.licenseStatus === "verified"
    if (body.licenseType) update.licenseType = body.licenseType
    update.licenseCheckedAt = new Date()
  }
  if (body.seo) {
    update.seoJson = jsonStringify(body.seo)
  } else if (body.title || body.description) {
    const cur = await db.content.findUnique({ where: { id } })
    if (cur) {
      update.seoJson = buildSeo({
        title: body.title || cur.title,
        description: body.description || cur.description,
        canonical: `/movie/${cur.slug}`,
      })
    }
  }
  const updated = await db.content.update({ where: { id }, data: update })
  await db.auditLog.create({
    data: {
      actor: "admin",
      action: "content.edited",
      targetType: "content",
      target: id,
      detail: jsonStringify(update),
      ip: getClientIp(req),
      contentId: id,
    },
  }).catch(() => {})
  return NextResponse.json({ ok: true, content: updated })
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const ok = requireAdmin(req)
  if (!ok.ok) return NextResponse.json({ error: ok.reason }, { status: 401 })
  const { id } = await ctx.params
  await db.content.delete({ where: { id } })
  await db.auditLog.create({
    data: {
      actor: "admin",
      action: "content.deleted",
      targetType: "content",
      target: id,
      detail: "{}",
      ip: getClientIp(req),
    },
  }).catch(() => {})
  return NextResponse.json({ ok: true })
}
