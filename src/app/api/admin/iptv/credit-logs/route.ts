import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/admin"
import { fetchCreditLogs } from "@/lib/xtream/client"
import { db } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const ok = requireAdmin(req)
  if (!ok.ok) return NextResponse.json({ error: ok.reason }, { status: 401 })

  const { logs, demo, error } = await fetchCreditLogs()

  // Persist logs to DB for history (best-effort, skip if demo or already present)
  if (!demo && logs.length > 0) {
    try {
      for (const log of logs) {
        await db.iptvCreditLog.upsert({
          where: { logId: log.log_id },
          update: {
            apiUsername: log.api_username,
            info: log.info,
            date: log.date,
            creditsCharge: log.credits_charge,
            creditsLeft: log.credits_left,
            fetchedAt: new Date(),
          },
          create: {
            logId: log.log_id,
            apiUsername: log.api_username,
            info: log.info,
            date: log.date,
            creditsCharge: log.credits_charge,
            creditsLeft: log.credits_left,
          },
        })
      }
    } catch (e) {
      // best-effort
    }
  }

  // If real API returned empty or failed, fall back to local DB
  let finalLogs = logs
  if (!demo && logs.length === 0) {
    const localLogs = await db.iptvCreditLog.findMany({ orderBy: { fetchedAt: "desc" }, take: 50 })
    finalLogs = localLogs.map(l => ({
      log_id: l.logId || "",
      api_username: l.apiUsername || "",
      info: l.info,
      date: l.date || "",
      credits_charge: l.creditsCharge || "",
      credits_left: l.creditsLeft || "",
    }))
  }

  return NextResponse.json({ logs: finalLogs, demo, error })
}
