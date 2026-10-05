import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/admin"
import { db } from "@/lib/db"
import { jsonStringify, jsonParse } from "@/lib/import/util"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const ok = requireAdmin(req)
  if (!ok.ok) return NextResponse.json({ error: ok.reason }, { status: 401 })
  const rows = await db.homepageRow.findMany({ orderBy: { order: "asc" } })
  return NextResponse.json({
    rows: rows.map(r => ({
      id: r.id,
      key: r.key,
      title: r.title,
      enabled: r.enabled,
      order: r.order,
      filterType: r.filterType,
      filterJson: jsonParse(r.filterJson, {}),
      itemIds: jsonParse<string[]>(r.itemIds, []),
    })),
  })
}

export async function POST(req: NextRequest) {
  const ok = requireAdmin(req)
  if (!ok.ok) return NextResponse.json({ error: ok.reason }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const { title, key, filterType, filterJson, itemIds } = body
  if (!title || !key) return NextResponse.json({ error: "title and key required" }, { status: 400 })
  const existing = await db.homepageRow.findUnique({ where: { key } })
  if (existing) return NextResponse.json({ error: "key already exists" }, { status: 400 })
  const created = await db.homepageRow.create({
    data: {
      title, key,
      filterType: filterType || "dynamic",
      filterJson: jsonStringify(filterJson || {}),
      itemIds: jsonStringify(itemIds || []),
    },
  })
  return NextResponse.json({ row: created })
}

export async function PATCH(req: NextRequest) {
  const ok = requireAdmin(req)
  if (!ok.ok) return NextResponse.json({ error: ok.reason }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const { id, title, enabled, order, filterType, filterJson, itemIds } = body
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })
  const update: any = {}
  if (title !== undefined) update.title = title
  if (enabled !== undefined) update.enabled = enabled
  if (order !== undefined) update.order = order
  if (filterType !== undefined) update.filterType = filterType
  if (filterJson !== undefined) update.filterJson = jsonStringify(filterJson)
  if (itemIds !== undefined) update.itemIds = jsonStringify(itemIds)
  const updated = await db.homepageRow.update({ where: { id }, data: update })
  return NextResponse.json({ row: updated })
}

export async function DELETE(req: NextRequest) {
  const ok = requireAdmin(req)
  if (!ok.ok) return NextResponse.json({ error: ok.reason }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })
  await db.homepageRow.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
