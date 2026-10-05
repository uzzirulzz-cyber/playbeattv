import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/admin"
import { fetchAccountInfo, isXtreamConfigured, getServerUrl } from "@/lib/xtream/client"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const ok = requireAdmin(req)
  if (!ok.ok) return NextResponse.json({ error: ok.reason }, { status: 401 })

  const { info, demo, error } = await fetchAccountInfo()
  return NextResponse.json({
    info,
    demo,
    error,
    configured: isXtreamConfigured(),
    serverUrl: getServerUrl(),
  })
}
