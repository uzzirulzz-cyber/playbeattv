import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/admin"
import { db } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const ok = requireAdmin(req)
  if (!ok.ok) return NextResponse.json({ error: ok.reason }, { status: 401 })
  const queries = await db.sourceQuery.findMany({ orderBy: { createdAt: "desc" } })
  return NextResponse.json({
    queries: queries.map(q => ({
      id: q.id, query: q.query, source: q.source, enabled: q.enabled,
      lastUsed: q.lastUsed, useCount: q.useCount,
    })),
  })
}

export async function POST(req: NextRequest) {
  const ok = requireAdmin(req)
  if (!ok.ok) return NextResponse.json({ error: ok.reason }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const query = (body.query || "").trim()
  const source = body.source || "youtube"
  if (!query) return NextResponse.json({ error: "query required" }, { status: 400 })
  const created = await db.sourceQuery.create({ data: { query, source } })
  return NextResponse.json({ query: created })
}

export async function DELETE(req: NextRequest) {
  const ok = requireAdmin(req)
  if (!ok.ok) return NextResponse.json({ error: ok.reason }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })
  await db.sourceQuery.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest) {
  const ok = requireAdmin(req)
  if (!ok.ok) return NextResponse.json({ error: ok.reason }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const id = body.id
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })
  const update: any = {}
  if ("enabled" in body) update.enabled = body.enabled
  if ("query" in body) update.query = body.query
  const updated = await db.sourceQuery.update({ where: { id }, data: update })
  return NextResponse.json({ query: updated })
}
