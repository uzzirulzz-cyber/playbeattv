import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { fetchM3uPlaylist, demoM3uPlaylist, isXtreamConfigured, getServerUrl, buildM3uUrl } from "@/lib/xtream/client"

export const dynamic = "force-dynamic"

// Public: anyone can fetch the M3U for a given line ID (the line ID is a long cuid — security by obscurity + line must be active)
export async function GET(_req: NextRequest, ctx: { params: Promise<{ lineId: string }> }) {
  const { lineId } = await ctx.params

  // Demo line ID — returns the demo playlist
  if (lineId === "demo" || lineId === "preview") {
    return new NextResponse(demoM3uPlaylist(), {
      headers: {
        "Content-Type": "audio/x-mpegurl",
        "Cache-Control": "no-store",
      },
    })
  }

  const line = await db.iptvLine.findUnique({ where: { id: lineId } })
  if (!line || line.status !== "active") {
    return NextResponse.json({ error: "Line not found or inactive" }, { status: 404 })
  }

  const serverUrl = getServerUrl()
  if (!serverUrl || !isXtreamConfigured()) {
    // Demo mode — return demo playlist so the player still works
    return new NextResponse(demoM3uPlaylist(), {
      headers: {
        "Content-Type": "audio/x-mpegurl",
        "Cache-Control": "no-store",
      },
    })
  }

  const { text, ok, error } = await fetchM3uPlaylist(serverUrl, line.username, line.password)
  if (!ok) {
    return NextResponse.json({ error: `Failed to fetch playlist: ${error}`, m3uUrl: buildM3uUrl(serverUrl, line.username, line.password) }, { status: 502 })
  }

  return new NextResponse(text, {
    headers: {
      "Content-Type": "audio/x-mpegurl",
      "Cache-Control": "no-store",
    },
  })
}
