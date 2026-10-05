import { NextRequest, NextResponse } from "next/server"
import { requireAdmin, getClientIp } from "@/lib/auth/admin"
import { importByUrl } from "@/lib/import/engine"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  const ok = requireAdmin(req)
  if (!ok.ok) return NextResponse.json({ error: ok.reason }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const url = (body.url || "").trim()
  if (!url) return NextResponse.json({ error: "url required" }, { status: 400 })
  const source = body.source // optional: youtube | wikimedia | direct
  const declaredLicense = body.declaredLicense
  const attribution = body.attribution
  const ip = getClientIp(req)
  const result = await importByUrl({ url, source, declaredLicense, attribution, requestedBy: "admin", ip })
  return NextResponse.json(result)
}
