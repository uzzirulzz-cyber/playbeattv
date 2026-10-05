import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/admin"
import { db } from "@/lib/db"
import { createActiveCode, extendActiveCode, deleteActiveCode, computeExpiry, planLabel, bouquetLabel } from "@/lib/xtream/client"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const ok = requireAdmin(req)
  if (!ok.ok) return NextResponse.json({ error: ok.reason }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")
  const q = searchParams.get("q")

  const where: any = {}
  if (status && status !== "all") where.status = status
  if (q) where.code = { contains: q }

  const codes = await db.activeCode.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
  })

  return NextResponse.json({
    codes: codes.map(c => ({
      id: c.id,
      code: c.code,
      password: c.password,
      conx: c.conx,
      plan: c.plan,
      planLabel: planLabel(c.plan),
      bid: c.bid,
      bouquetLabel: bouquetLabel(c.bid),
      addChannels: c.addChannels,
      addVods: c.addVods,
      adults: c.adults,
      notice: c.notice,
      status: c.status,
      startsAt: c.startsAt,
      expiresAt: c.expiresAt,
      activatedAt: c.activatedAt,
      createdAt: c.createdAt,
    })),
  })
}

export async function POST(req: NextRequest) {
  const ok = requireAdmin(req)
  if (!ok.ok) return NextResponse.json({ error: ok.reason }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const action = body.action || "create"

  if (action === "create") {
    const { conx, bid, plan, addChannels, addVods, adults, notice, callback } = body
    const result = await createActiveCode({
      conx: parseInt(conx) || 1,
      bid: bid || "[5,11]",
      plan: parseInt(plan) || 11,
      addChannels, addVods, adults,
      notice, callback,
    })
    if (!result.ok) return NextResponse.json({ error: result.msg }, { status: 400 })

    const startsAt = new Date()
    const expiresAt = computeExpiry(startsAt, parseInt(plan) || 11)
    const code = await db.activeCode.create({
      data: {
        code: result.code || "00000000000000",
        conx: parseInt(conx) || 1,
        plan: parseInt(plan) || 11,
        bid: bid || "[5,11]",
        addChannels: addChannels !== false,
        addVods: addVods !== false,
        adults: !!adults,
        notice: notice || null,
        callback: callback || null,
        startsAt,
        expiresAt,
        status: "active",
      },
    })
    await db.auditLog.create({
      data: {
        actor: "admin",
        action: "iptv.activecode.created",
        targetType: "activecode",
        target: code.id,
        detail: JSON.stringify({ code: code.code, plan, demo: result.demo }),
        ip: undefined,
      },
    }).catch(() => {})
    return NextResponse.json({ ok: true, code, demo: result.demo, msg: result.msg })
  }

  if (action === "extend") {
    const { id, plan } = body
    if (!id || !plan) return NextResponse.json({ error: "id and plan required" }, { status: 400 })
    const code = await db.activeCode.findUnique({ where: { id } })
    if (!code) return NextResponse.json({ error: "code not found" }, { status: 404 })
    const result = await extendActiveCode(code.code, parseInt(plan))
    if (!result.ok) return NextResponse.json({ error: result.msg }, { status: 400 })
    const baseDate = code.expiresAt && code.expiresAt > new Date() ? code.expiresAt : new Date()
    const newExpiry = computeExpiry(baseDate, parseInt(plan))
    await db.activeCode.update({ where: { id }, data: { plan: parseInt(plan), expiresAt: newExpiry, status: "active" } })
    return NextResponse.json({ ok: true, demo: result.demo, msg: result.msg })
  }

  if (action === "delete") {
    const { id, force } = body
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })
    const code = await db.activeCode.findUnique({ where: { id } })
    if (!code) return NextResponse.json({ error: "code not found" }, { status: 404 })
    const result = await deleteActiveCode(code.code, !!force)
    if (!result.ok) return NextResponse.json({ error: result.msg }, { status: 400 })
    await db.activeCode.update({ where: { id }, data: { status: "deleted" } })
    return NextResponse.json({ ok: true, demo: result.demo, msg: result.msg })
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 })
}
