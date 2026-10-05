import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/admin"
import { db } from "@/lib/db"
import { isYouTubeConfigured } from "@/lib/import/youtube"
import { isXtreamConfigured } from "@/lib/xtream/client"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const isAdmin = requireAdmin(req).ok
  const settings = await db.settings.findUnique({ where: { id: "singleton" } })
  return NextResponse.json({
    admin: isAdmin,
    authConfigured: !!process.env.ADMIN_TOKEN || !!process.env.ADMIN_PASSWORD,
    youtube: {
      configured: isYouTubeConfigured(),
    },
    xtream: {
      configured: isXtreamConfigured(),
      enabled: settings?.iptvEnabled ?? false,
    },
    settings: {
      autoImport: settings?.autoImport ?? false,
      autoPublishVerified: settings?.autoPublishVerified ?? false,
      importFrequency: settings?.importFrequency ?? "daily",
      maxImportPerRun: settings?.maxImportPerRun ?? 50,
      minDurationSec: settings?.minDurationSec ?? 60,
      lastImportAt: settings?.lastImportAt,
    },
  })
}

// POST — set admin token cookie (login)
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const token = body.token
  if (!token) return NextResponse.json({ error: "token required" }, { status: 400 })
  const expected = process.env.ADMIN_TOKEN || process.env.ADMIN_PASSWORD
  if (!expected) {
    // Auth disabled in dev — accept any token
    return NextResponse.json({ ok: true, admin: true, dev: true })
  }
  if (token !== expected) return NextResponse.json({ error: "invalid token" }, { status: 401 })
  const res = NextResponse.json({ ok: true, admin: true })
  res.cookies.set("pb_admin", token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  })
  return res
}

// DELETE — logout
export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete("pb_admin")
  return res
}
