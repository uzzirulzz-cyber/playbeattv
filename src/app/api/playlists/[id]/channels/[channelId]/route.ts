import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin } from "@/lib/auth"
import { isValidStreamUrl } from "@/lib/m3u"

export const dynamic = "force-dynamic"

// PATCH /api/playlists/[id]/channels/[channelId] — update a channel (admin)
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string; channelId: string }> }) {
  const ok = requireAdmin(req)
  if (!ok.ok) return NextResponse.json({ error: ok.reason }, { status: 401 })
  const { id, channelId } = await ctx.params
  const body = await req.json().catch(() => ({}))

  const update: any = {}
  if ("name" in body) {
    const name = (body.name || "").trim()
    if (!name) return NextResponse.json({ error: "name cannot be empty" }, { status: 400 })
    update.name = name
  }
  if ("streamUrl" in body) {
    const streamUrl = (body.streamUrl || "").trim()
    if (!streamUrl) return NextResponse.json({ error: "streamUrl cannot be empty" }, { status: 400 })
    if (!isValidStreamUrl(streamUrl)) {
      return NextResponse.json({ error: "streamUrl must start with http(s)://, rtmp://, or rtsp://" }, { status: 400 })
    }
    update.streamUrl = streamUrl
  }
  if ("category" in body) update.category = body.category?.trim() || null
  if ("logoUrl" in body)   update.logoUrl = body.logoUrl?.trim() || null
  if ("epgUrl" in body)    update.epgUrl = body.epgUrl?.trim() || null
  if ("tvgId" in body)     update.tvgId = body.tvgId?.trim() || null
  if ("tvgName" in body)   update.tvgName = body.tvgName?.trim() || null
  if ("metadata" in body)  update.metadata = body.metadata ? JSON.stringify(body.metadata) : "{}"
  if ("sortOrder" in body) update.sortOrder = parseInt(body.sortOrder) || 0

  try {
    const updated = await db.channel.update({
      where: { id: channelId, playlistId: id },
      data: update,
    })
    return NextResponse.json({ channel: updated })
  } catch {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 })
  }
}

// DELETE /api/playlists/[id]/channels/[channelId] — delete a channel (admin)
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string; channelId: string }> }) {
  const ok = requireAdmin(req)
  if (!ok.ok) return NextResponse.json({ error: ok.reason }, { status: 401 })
  const { id, channelId } = await ctx.params
  try {
    await db.channel.delete({ where: { id: channelId, playlistId: id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 })
  }
}
