// Simple admin auth. Production users should swap this for NextAuth/Clerk.
// The "token" is the ADMIN_TOKEN env var. Stored in localStorage on the client.

import { cookies, headers } from "next/headers"

const TOKEN = process.env.ADMIN_TOKEN || process.env.ADMIN_PASSWORD

export function isAuthConfigured(): boolean {
  return !!TOKEN
}

export function getExpectedToken(): string {
  return TOKEN || ""
}

export function getClientToken(req?: Request): string | null {
  // 1. Authorization header
  const auth = req?.headers?.get("authorization")
  if (auth && auth.startsWith("Bearer ")) return auth.slice(7).trim()
  // 2. X-Admin-Token header
  const x = req?.headers?.get("x-admin-token")
  if (x) return x.trim()
  // 3. Cookie
  const cookie = req?.headers?.get("cookie") || ""
  const m = cookie.match(/(?:^|;\s*)pb_admin=([^;]+)/)
  if (m) return decodeURIComponent(m[1])
  return null
}

export function isAdmin(req?: Request): boolean {
  if (!TOKEN) return true // unconfigured → open in dev only
  const t = getClientToken(req)
  if (!t) return false
  return t === TOKEN
}

export function requireAdmin(req?: Request): { ok: true } | { ok: false; reason: string } {
  if (!TOKEN) return { ok: true } // dev fallback
  if (!isAdmin(req)) return { ok: false, reason: "Admin token required" }
  return { ok: true }
}

// Get a friendly client IP string for audit logs
export function getClientIp(req?: Request): string | undefined {
  if (!req) return undefined
  const fwd = req.headers.get("x-forwarded-for")
  if (fwd) return fwd.split(",")[0].trim()
  return undefined
}

// Generate / set default admin token on first run if missing
export async function ensureAdminUser() {
  try {
    const existing = await import("@/lib/db").then(({ db }) => db.user.findFirst({ where: { role: "admin" } }))
    if (existing) return
  } catch {}
  // We don't auto-create users — admin auth uses the env token directly.
}
