import { NextRequest } from "next/server"

// Token-based admin auth.
// Reads: OPEN (anyone can view playlists + preview + export).
// Writes: require the admin token.
//
// The token is set in env (ADMIN_TOKEN). If unset, writes are open in dev.

export function getAdminToken(): string | null {
  const k = process.env.ADMIN_TOKEN
  return k && k.trim() ? k.trim() : null
}

export function isAuthConfigured(): boolean {
  return !!getAdminToken()
}

export function isAdmin(req?: NextRequest): boolean {
  const token = getAdminToken()
  if (!token) return true // dev mode — open
  // Check Authorization header
  const auth = req?.headers?.get("authorization")
  if (auth && auth.startsWith("Bearer ")) {
    return auth.slice(7).trim() === token
  }
  // Check X-Admin-Token header
  const x = req?.headers?.get("x-admin-token")
  if (x && x.trim() === token) return true
  // Check cookie
  const cookie = req?.headers?.get("cookie") || ""
  const m = cookie.match(/(?:^|;\s*)pb_admin=([^;]+)/)
  if (m && decodeURIComponent(m[1]) === token) return true
  return false
}

export function requireAdmin(req?: NextRequest): { ok: true } | { ok: false; reason: string } {
  if (!isAuthConfigured()) return { ok: true } // dev
  if (!isAdmin(req)) return { ok: false, reason: "Admin token required" }
  return { ok: true }
}

export function getClientIp(req?: NextRequest): string | undefined {
  if (!req) return undefined
  const fwd = req.headers.get("x-forwarded-for")
  if (fwd) return fwd.split(",")[0].trim()
  return undefined
}
