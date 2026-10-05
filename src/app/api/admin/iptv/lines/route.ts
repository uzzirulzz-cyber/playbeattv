import { NextRequest, NextResponse } from "next/server"
import { requireAdmin, getClientIp } from "@/lib/auth/admin"
import { db } from "@/lib/db"
import { createLine, extendLine, deleteLine, editLine, computeExpiry, planLabel, bouquetLabel } from "@/lib/xtream/client"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const ok = requireAdmin(req)
  if (!ok.ok) return NextResponse.json({ error: ok.reason }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status") // active | expired | all
  const q = searchParams.get("q")

  const where: any = {}
  if (status && status !== "all") where.status = status
  if (q) where.username = { contains: q }

  const lines = await db.iptvLine.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
  })

  return NextResponse.json({
    lines: lines.map(l => ({
      id: l.id,
      username: l.username,
      serverUrl: l.serverUrl,
      conx: l.conx,
      plan: l.plan,
      planLabel: planLabel(l.plan),
      bid: l.bid,
      bouquetLabel: bouquetLabel(l.bid),
      addChannels: l.addChannels,
      addVods: l.addVods,
      adults: l.adults,
      notice: l.notice,
      status: l.status,
      startsAt: l.startsAt,
      expiresAt: l.expiresAt,
      createdAt: l.createdAt,
    })),
  })
}

export async function POST(req: NextRequest) {
  const ok = requireAdmin(req)
  if (!ok.ok) return NextResponse.json({ error: ok.reason }, { status: 401 })
  const body = await req.json().catch(() => ({}))

  const action = body.action || "create"

  if (action === "create") {
    const { username, password, serverUrl, conx, bid, plan, addChannels, addVods, adults, notice } = body
    if (!username || !password) return NextResponse.json({ error: "username and password required" }, { status: 400 })
    if (username.length < 6 || username.length > 23) return NextResponse.json({ error: "username must be 6-23 chars" }, { status: 400 })
    if (!/^[a-z0-9._-]+$/i.test(username)) return NextResponse.json({ error: "username allows only a-z, 0-9, ., _, -" }, { status: 400 })
    if (!/^[a-z0-9._-]+$/i.test(password)) return NextResponse.json({ error: "password allows only a-z, 0-9, ., _, -" }, { status: 400 })

    // Check local dup
    const existing = await db.iptvLine.findUnique({ where: { username } })
    if (existing) return NextResponse.json({ error: "username already exists locally" }, { status: 400 })

    // If serverUrl is provided, this is a customer-side line on a 3rd-party panel
    // (no reseller API call needed — just store the credentials locally so we can
    // proxy M3U requests). Otherwise, this is a reseller-managed line — call the
    // Xtream Masters reseller API to actually provision it.
    let result: { ok: boolean; demo: boolean; msg: string } = { ok: true, demo: false, msg: "Customer-side line — no reseller API call needed" }
    if (!serverUrl) {
      result = await createLine({
        username, password,
        conx: parseInt(conx) || 1,
        bid: bid || "[5,11]",
        plan: parseInt(plan) || 11,
        addChannels, addVods, adults, notice,
      })
      if (!result.ok) return NextResponse.json({ error: result.msg }, { status: 400 })
    }

    const startsAt = new Date()
    const expiresAt = computeExpiry(startsAt, parseInt(plan) || 11)
    const line = await db.iptvLine.create({
      data: {
        username, password,
        serverUrl: serverUrl || null,
        conx: parseInt(conx) || 1,
        plan: parseInt(plan) || 11,
        bid: bid || "[5,11]",
        addChannels: addChannels !== false,
        addVods: addVods !== false,
        adults: !!adults,
        notice: notice || null,
        startsAt,
        expiresAt,
        status: "active",
      },
    })
    await db.auditLog.create({
      data: {
        actor: "admin",
        action: "iptv.line.created",
        targetType: "iptv_line",
        target: line.id,
        detail: JSON.stringify({ username, plan, bid, serverUrl: serverUrl || "(reseller)", demo: result.demo }),
        ip: getClientIp(req),
      },
    }).catch(() => {})
    return NextResponse.json({ ok: true, line, demo: result.demo, msg: result.msg })
  }

  if (action === "extend") {
    const { id, plan } = body
    if (!id || !plan) return NextResponse.json({ error: "id and plan required" }, { status: 400 })
    const line = await db.iptvLine.findUnique({ where: { id } })
    if (!line) return NextResponse.json({ error: "line not found" }, { status: 404 })

    const result = await extendLine(line.username, parseInt(plan))
    if (!result.ok) return NextResponse.json({ error: result.msg }, { status: 400 })

    const baseDate = line.expiresAt && line.expiresAt > new Date() ? line.expiresAt : new Date()
    const newExpiry = computeExpiry(baseDate, parseInt(plan))
    await db.iptvLine.update({
      where: { id },
      data: { plan: parseInt(plan), expiresAt: newExpiry, status: "active" },
    })
    await db.auditLog.create({
      data: {
        actor: "admin",
        action: "iptv.line.extended",
        targetType: "iptv_line",
        target: line.id,
        detail: JSON.stringify({ username: line.username, plan, demo: result.demo }),
        ip: getClientIp(req),
      },
    }).catch(() => {})
    return NextResponse.json({ ok: true, demo: result.demo, msg: result.msg })
  }

  if (action === "edit") {
    const { id, newUsername, newPassword, notice } = body
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })
    const line = await db.iptvLine.findUnique({ where: { id } })
    if (!line) return NextResponse.json({ error: "line not found" }, { status: 404 })

    const targetUsername = newUsername || line.username
    const result = await editLine({
      username: line.username,
      newUsername: targetUsername,
      newPassword: newPassword || "",
      notice: notice || line.notice || "",
    })
    if (!result.ok) return NextResponse.json({ error: result.msg }, { status: 400 })

    const update: any = {}
    if (newUsername) update.username = newUsername
    if (newPassword) update.password = newPassword
    if (notice !== undefined) update.notice = notice
    if (Object.keys(update).length > 0) {
      await db.iptvLine.update({ where: { id }, data: update })
    }
    await db.auditLog.create({
      data: {
        actor: "admin",
        action: "iptv.line.edited",
        targetType: "iptv_line",
        target: line.id,
        detail: JSON.stringify({ oldUsername: line.username, newUsername: targetUsername, demo: result.demo }),
        ip: getClientIp(req),
      },
    }).catch(() => {})
    return NextResponse.json({ ok: true, demo: result.demo, msg: result.msg })
  }

  if (action === "delete") {
    const { id, force } = body
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })
    const line = await db.iptvLine.findUnique({ where: { id } })
    if (!line) return NextResponse.json({ error: "line not found" }, { status: 404 })

    const result = await deleteLine(line.username, !!force)
    if (!result.ok) return NextResponse.json({ error: result.msg }, { status: 400 })

    await db.iptvLine.update({ where: { id }, data: { status: "deleted" } })
    await db.auditLog.create({
      data: {
        actor: "admin",
        action: "iptv.line.deleted",
        targetType: "iptv_line",
        target: line.id,
        detail: JSON.stringify({ username: line.username, force: !!force, demo: result.demo }),
        ip: getClientIp(req),
      },
    }).catch(() => {})
    return NextResponse.json({ ok: true, demo: result.demo, msg: result.msg })
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 })
}
