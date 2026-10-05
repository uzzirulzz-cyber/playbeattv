import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin } from "@/lib/auth"
import { isValidStreamUrl } from "@/lib/m3u"

export const dynamic = "force-dynamic"

// GET /api/playlists/[id]/channels — list channels (open read)
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const channels = await db.channel.findMany({
    where: { playlistId: id },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  })
  return NextResponse.json({
    channels: channels.map(c => ({
      id: c.id,
      name: c.name,
      streamUrl: c.streamUrl,
      category: c.category,
      logoUrl: c.logoUrl,
      epgUrl: c.epgUrl,
      tvgId: c.tvgId,
      tvgName: c.tvgName,
      metadata: c.metadata,
      sortOrder: c.sortOrder,
    })),
  })
}

// POST /api/playlists/[id]/channels — add a channel (admin)
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const ok = requireAdmin(req)
  if (!ok.ok) return NextResponse.json({ error: ok.reason }, { status: 401 })
  const { id } = await ctx.params
  const body = await req.json().catch(() => ({}))

  const name = (body.name || "").trim()
  const streamUrl = (body.streamUrl || "").trim()
  if (!name)         return NextResponse.json({ error: "name required" }, { status: 400 })
  if (!streamUrl)    return NextResponse.json({ error: "streamUrl required" }, { status: 400 })
  if (!isValidStreamUrl(streamUrl)) {
    return NextResponse.json({ error: "streamUrl must start with http(s)://, rtmp://, or rtsp://" }, { status: 400 })
  }

  const playlist = await db.playlist.findUnique({ where: { id } })
  if (!playlist) return NextResponse.json({ error: "Playlist not found" }, { status: 404 })

  // Determine sort order — append to end
  const maxOrder = await db.channel.findFirst({
    where: { playlistId: id },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  })

  const channel = await db.channel.create({
    data: {
      playlistId: id,
      name,
      streamUrl,
      category: body.category?.trim() || null,
      logoUrl: body.logoUrl?.trim() || null,
      epgUrl: body.epgUrl?.trim() || null,
      tvgId: body.tvgId?.trim() || null,
      tvgName: body.tvgName?.trim() || null,
      metadata: body.metadata ? JSON.stringify(body.metadata) : "{}",
      sortOrder: body.sortOrder ?? (maxOrder?.sortOrder ?? -1) + 1,
    },
  })
  return NextResponse.json({ channel })
}
