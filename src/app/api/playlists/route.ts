import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin } from "@/lib/auth"

export const dynamic = "force-dynamic"

// GET /api/playlists — list all playlists (open read)
export async function GET() {
  const playlists = await db.playlist.findMany({
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { channels: true } } },
  })
  return NextResponse.json({
    playlists: playlists.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      epgUrl: p.epgUrl,
      channelsCount: p._count.channels,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    })),
  })
}

// POST /api/playlists — create a new playlist (admin)
export async function POST(req: NextRequest) {
  const ok = requireAdmin(req)
  if (!ok.ok) return NextResponse.json({ error: ok.reason }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const name = (body.name || "").trim()
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 })
  const description = body.description?.trim() || null
  const epgUrl = body.epgUrl?.trim() || null

  const playlist = await db.playlist.create({
    data: { name, description, epgUrl },
  })
  return NextResponse.json({ playlist })
}
