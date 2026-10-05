import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export const dynamic = "force-dynamic"

// POST /api/admin/iptv/callback
// Reseller API calls this when an ActiveCode is first run in a player.
// Body: {"action":"active", "activecode":"01234567891011", "start":"1658762715", "end":"1669772715"}
export async function POST(req: NextRequest) {
  let body: any
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  // Per spec: callback should respond with '1' for handshake
  if (body.handshake !== undefined) {
    return new NextResponse("1", { headers: { "Content-Type": "text/plain" } })
  }

  if (body.action === "active" && body.activecode) {
    const code = String(body.activecode)
    const start = String(body.start || "")
    const end = String(body.end || "")
    if (start.length !== 11 || end.length !== 11 || !/^\d+$/.test(start) || !/^\d+$/.test(end)) {
      return new NextResponse("invalid", { status: 400, headers: { "Content-Type": "text/plain" } })
    }

    try {
      const line = await db.activeCode.findUnique({ where: { code } })
      if (line) {
        await db.activeCode.update({
          where: { id: line.id },
          data: { activatedAt: new Date() },
        })
        await db.auditLog.create({
          data: {
            actor: "system:xtream",
            action: "iptv.activecode.activated",
            targetType: "activecode",
            target: line.id,
            detail: JSON.stringify({ code, start, end }),
          },
        }).catch(() => {})
      }
    } catch {}
    return new NextResponse("ok", { headers: { "Content-Type": "text/plain" } })
  }

  return new NextResponse("ignored", { status: 200, headers: { "Content-Type": "text/plain" } })
}

export async function GET(req: NextRequest) {
  // Some resellers use GET; treat same as POST
  return POST(req)
}
