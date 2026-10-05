import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { buildM3u } from "@/lib/m3u"

export const dynamic = "force-dynamic"

// GET /api/playlists/[id]/export — return the playlist as M3U text
// (open read — long cuid URL is the only secret)
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const playlist = await db.playlist.findUnique({
    where: { id },
    include: {
      channels: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }] },
    },
  })
  if (!playlist) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const m3u = buildM3u({
    channels: playlist.channels.map(c => ({
      name: c.name,
      streamUrl: c.streamUrl,
      category: c.category,
      logoUrl: c.logoUrl,
      tvgId: c.tvgId,
      tvgName: c.tvgName,
      metadata: c.metadata,
    })),
    playlistEpgUrl: playlist.epgUrl,
    playlistName: playlist.name,
  })

  return new NextResponse(m3u, {
    headers: {
      "Content-Type": "audio/x-mpegurl; charset=utf-8",
      "Content-Disposition": `attachment; filename="${playlist.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.m3u8"`,
      "Cache-Control": "no-store",
    },
  })
}
