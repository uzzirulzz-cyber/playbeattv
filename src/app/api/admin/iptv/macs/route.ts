import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/admin"
import { db } from "@/lib/db"
import { createMac, extendMac, editMac, deleteMac, computeExpiry, isValidMacAddress, planLabel, bouquetLabel } from "@/lib/xtream/client"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const ok = requireAdmin(req)
  if (!ok.ok) return NextResponse.json({ error: ok.reason }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")
  const q = searchParams.get("q")

  const where: any = {}
  if (status && status !== "all") where.status = status
  if (q) where.address = { contains: q }

  const macs = await db.macAddress.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
  })

  return NextResponse.json({
    macs: macs.map(m => ({
      id: m.id,
      address: m.address,
      conx: m.conx,
      plan: m.plan,
      planLabel: planLabel(m.plan),
      bid: m.bid,
      bouquetLabel: bouquetLabel(m.bid),
      addChannels: m.addChannels,
      addVods: m.addVods,
      adults: m.adults,
      notice: m.notice,
      status: m.status,
      startsAt: m.startsAt,
      expiresAt: m.expiresAt,
      createdAt: m.createdAt,
    })),
  })
}

export async function POST(req: NextRequest) {
  const ok = requireAdmin(req)
  if (!ok.ok) return NextResponse.json({ error: ok.reason }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const action = body.action || "create"

  if (action === "create") {
    const { address, conx, bid, plan, addChannels, addVods, adults, notice } = body
    if (!address) return NextResponse.json({ error: "address required" }, { status: 400 })
    if (!isValidMacAddress(address)) return NextResponse.json({ error: "invalid MAC format (use 00:AA:BB:CC:DD:11)" }, { status: 400 })

    const existing = await db.macAddress.findUnique({ where: { address } })
    if (existing) return NextResponse.json({ error: "MAC already registered" }, { status: 400 })

    const result = await createMac({
      address, conx: parseInt(conx) || 1, bid: bid || "[5,11]", plan: parseInt(plan) || 11,
      addChannels, addVods, adults, notice,
    })
    if (!result.ok) return NextResponse.json({ error: result.msg }, { status: 400 })

    const startsAt = new Date()
    const expiresAt = computeExpiry(startsAt, parseInt(plan) || 11)
    const mac = await db.macAddress.create({
      data: {
        address,
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
    return NextResponse.json({ ok: true, mac, demo: result.demo, msg: result.msg })
  }

  if (action === "extend") {
    const { id, plan } = body
    if (!id || !plan) return NextResponse.json({ error: "id and plan required" }, { status: 400 })
    const mac = await db.macAddress.findUnique({ where: { id } })
    if (!mac) return NextResponse.json({ error: "mac not found" }, { status: 404 })
    const result = await extendMac(mac.address, parseInt(plan))
    if (!result.ok) return NextResponse.json({ error: result.msg }, { status: 400 })
    const baseDate = mac.expiresAt && mac.expiresAt > new Date() ? mac.expiresAt : new Date()
    const newExpiry = computeExpiry(baseDate, parseInt(plan))
    await db.macAddress.update({ where: { id }, data: { plan: parseInt(plan), expiresAt: newExpiry, status: "active" } })
    return NextResponse.json({ ok: true, demo: result.demo, msg: result.msg })
  }

  if (action === "edit") {
    const { id, newAddress, notice } = body
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })
    const mac = await db.macAddress.findUnique({ where: { id } })
    if (!mac) return NextResponse.json({ error: "mac not found" }, { status: 404 })
    if (newAddress && !isValidMacAddress(newAddress)) return NextResponse.json({ error: "invalid MAC format" }, { status: 400 })

    const result = await editMac({
      address: mac.address,
      newAddress: newAddress || mac.address,
      notice: notice || mac.notice || "",
    })
    if (!result.ok) return NextResponse.json({ error: result.msg }, { status: 400 })

    const update: any = {}
    if (newAddress) update.address = newAddress
    if (notice !== undefined) update.notice = notice
    if (Object.keys(update).length > 0) {
      await db.macAddress.update({ where: { id }, data: update })
    }
    return NextResponse.json({ ok: true, demo: result.demo, msg: result.msg })
  }

  if (action === "delete") {
    const { id, force } = body
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })
    const mac = await db.macAddress.findUnique({ where: { id } })
    if (!mac) return NextResponse.json({ error: "mac not found" }, { status: 404 })
    const result = await deleteMac(mac.address, !!force)
    if (!result.ok) return NextResponse.json({ error: result.msg }, { status: 400 })
    await db.macAddress.update({ where: { id }, data: { status: "deleted" } })
    return NextResponse.json({ ok: true, demo: result.demo, msg: result.msg })
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 })
}
