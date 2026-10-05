import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin } from "@/lib/auth"

export const dynamic = "force-dynamic"

// GET /api/playlists/[id] — single playlist with channels (open read)
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const playlist = await db.playlist.findUnique({
    where: { id },
    include: {
      channels: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }] },
    },
  })
  if (!playlist) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({
    playlist: {
      id: playlist.id,
      name: playlist.name,
      description: playlist.description,
      epgUrl: playlist.epgUrl,
      createdAt: playlist.createdAt,
      updatedAt: playlist.updatedAt,
      channels: playlist.channels.map(c => ({
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
    },
  })
}

// PATCH /api/playlists/[id] — update playlist metadata (admin)
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const ok = requireAdmin(req)
  if (!ok.ok) return NextResponse.json({ error: ok.reason }, { status: 401 })
  const { id } = await ctx.params
  const body = await req.json().catch(() => ({}))
  const update: any = {}
  if ("name" in body)        update.name = (body.name || "").trim() || undefined
  if ("description" in body) update.description = body.description?.trim() || null
  if ("epgUrl" in body)      update.epgUrl = body.epgUrl?.trim() || null
  try {
    const updated = await db.playlist.update({ where: { id }, data: update })
    return NextResponse.json({ playlist: updated })
  } catch {
    return NextResponse.json({ error: "Playlist not found" }, { status: 404 })
  }
}

// DELETE /api/playlists/[id] — delete playlist + all channels (cascade) (admin)
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const ok = requireAdmin(req)
  if (!ok.ok) return NextResponse.json({ error: ok.reason }, { status: 401 })
  const { id } = await ctx.params
  try {
    await db.playlist.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Playlist not found" }, { status: 404 })
  }
}
