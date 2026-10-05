import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin } from "@/lib/auth"
import { parseM3u, fetchM3uFromUrl, type ParsedChannel } from "@/lib/m3u"

export const dynamic = "force-dynamic"
export const maxDuration = 60

// POST /api/playlists/[id]/import — bulk-add parsed channels to an existing playlist
// Body: { channels: ParsedChannel[], dedupe?: boolean }
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const ok = requireAdmin(req)
  if (!ok.ok) return NextResponse.json({ error: ok.reason }, { status: 401 })
  const { id } = await ctx.params
  const body = await req.json().catch(() => ({}))

  const channels: ParsedChannel[] = body.channels || []
  if (!Array.isArray(channels) || channels.length === 0) {
    return NextResponse.json({ error: "channels array required" }, { status: 400 })
  }

  const playlist = await db.playlist.findUnique({ where: { id } })
  if (!playlist) return NextResponse.json({ error: "Playlist not found" }, { status: 404 })

  const dedupe = body.dedupe !== false // default true

  // Optionally check for existing channels with same streamUrl to avoid duplicates
  let existingUrls = new Set<string>()
  if (dedupe) {
    const existing = await db.channel.findMany({
      where: { playlistId: id },
      select: { streamUrl: true },
    })
    existingUrls = new Set(existing.map(c => c.streamUrl))
  }

  const toCreate: any[] = []
  let skippedDuplicates = 0
  for (const ch of channels) {
    if (!ch.name || !ch.streamUrl) continue
    if (dedupe && existingUrls.has(ch.streamUrl)) {
      skippedDuplicates++
      continue
    }
    toCreate.push({
      playlistId: id,
      name: ch.name,
      streamUrl: ch.streamUrl,
      category: ch.category || null,
      logoUrl: ch.logoUrl || null,
      epgUrl: null,
      tvgId: ch.tvgId || null,
      tvgName: ch.tvgName || null,
      metadata: ch.metadata ? JSON.stringify(ch.metadata) : "{}",
    })
  }

  if (toCreate.length > 0) {
    await db.channel.createMany({ data: toCreate })
  }

  return NextResponse.json({
    ok: true,
    imported: toCreate.length,
    skippedDuplicates,
    total: channels.length,
  })
}
