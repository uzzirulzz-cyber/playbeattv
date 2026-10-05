import { NextRequest, NextResponse } from "next/server"
import { isAuthConfigured, isAdmin } from "@/lib/auth"

export const dynamic = "force-dynamic"

// GET /api/admin/status — public endpoint that reports whether admin auth is configured
// and whether the current request is authenticated.
export async function GET(req: NextRequest) {
  return NextResponse.json({
    admin: isAdmin(req),
    authConfigured: isAuthConfigured(),
  })
}

// POST /api/admin/status — login (set cookie)
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const token = body.token
  if (!token) return NextResponse.json({ error: "token required" }, { status: 400 })

  const expected = process.env.ADMIN_TOKEN
  if (!expected) {
    // Dev mode — accept any token
    return NextResponse.json({ ok: true, admin: true, dev: true })
  }
  if (token !== expected) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true, admin: true })
  res.cookies.set("pb_admin", token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
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
