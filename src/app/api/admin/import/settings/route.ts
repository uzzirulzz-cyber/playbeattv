import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/admin"
import { db } from "@/lib/db"
import { isYouTubeConfigured } from "@/lib/import/youtube"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const ok = requireAdmin(req)
  if (!ok.ok) return NextResponse.json({ error: ok.reason }, { status: 401 })
  const s = await db.settings.findUnique({ where: { id: "singleton" } })
  return NextResponse.json({
    autoImport: s?.autoImport ?? false,
    autoPublishVerified: s?.autoPublishVerified ?? false,
    importFrequency: s?.importFrequency ?? "daily",
    maxImportPerRun: s?.maxImportPerRun ?? 50,
    minDurationSec: s?.minDurationSec ?? 60,
    lastImportAt: s?.lastImportAt,
    youtubeApiKeySet: isYouTubeConfigured(),
    authConfigured: !!process.env.ADMIN_TOKEN || !!process.env.ADMIN_PASSWORD,
  })
}

export async function PATCH(req: NextRequest) {
  const ok = requireAdmin(req)
  if (!ok.ok) return NextResponse.json({ error: ok.reason }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const allowed: any = {}
  for (const k of ["autoImport", "autoPublishVerified", "importFrequency", "maxImportPerRun", "minDurationSec"]) {
    if (k in body) allowed[k] = body[k]
  }
  const updated = await db.settings.upsert({
    where: { id: "singleton" },
    update: allowed,
    create: { id: "singleton", ...allowed },
  })
  await db.auditLog.create({
    data: {
      actor: "admin",
      action: "settings.changed",
      targetType: "setting",
      detail: JSON.stringify(allowed),
    },
  }).catch(() => {})
  return NextResponse.json({
    autoImport: updated.autoImport,
    autoPublishVerified: updated.autoPublishVerified,
    importFrequency: updated.importFrequency,
    maxImportPerRun: updated.maxImportPerRun,
    minDurationSec: updated.minDurationSec,
    lastImportAt: updated.lastImportAt,
    youtubeApiKeySet: isYouTubeConfigured(),
  })
}
