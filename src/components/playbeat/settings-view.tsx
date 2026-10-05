"use client"

import { useEffect, useState } from "react"
import { useApp } from "@/stores/app"
import { ArrowLeft, Shield, LogIn, LogOut, CheckCircle2 } from "lucide-react"

export function SettingsView() {
  const { setView, isAdmin, setAdmin } = useApp()
  const [token, setToken] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [authConfigured, setAuthConfigured] = useState<boolean | null>(null)

  useEffect(() => {
    fetch("/api/admin/status").then(r => r.json()).then(d => {
      setAdmin(d.admin)
      setAuthConfigured(d.authConfigured)
    }).catch(() => {})
  }, [setAdmin])

  const login = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token.trim()) return
    setLoading(true); setError(null)
    const res = await fetch("/api/admin/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
    const d = await res.json()
    setLoading(false)
    if (!res.ok) { setError(d.error || "Login failed"); return }
    setAdmin(true)
    setToken("")
    setView("playlists")
  }

  const logout = async () => {
    await fetch("/api/admin/status", { method: "DELETE" })
    setAdmin(false)
  }

  return (
    <div className="mx-auto max-w-md px-4 sm:px-8 py-8">
      <button onClick={() => setView("playlists")} className="mb-4 flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> All playlists
      </button>

      <div className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Settings</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Admin authentication for managing playlists and channels.
        </p>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-zinc-400 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-white">Admin access</h3>
            <p className="mt-1 text-xs text-zinc-500 leading-relaxed">
              Reading playlists is open. Creating, editing, and deleting requires an admin token.
              The token is set in the <code className="rounded bg-black/40 px-1 py-0.5 text-zinc-300">ADMIN_TOKEN</code> environment variable.
            </p>

            {isAdmin ? (
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" />
                  You are signed in as admin.
                </div>
                <button
                  onClick={logout}
                  className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-zinc-300 hover:bg-white/10"
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </div>
            ) : (
              <form onSubmit={login} className="mt-4 space-y-3">
                {authConfigured === false && (
                  <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-300">
                    Admin auth is not configured (no <code>ADMIN_TOKEN</code> env var set). You can sign in with any token in dev mode — but in production, set the env var to lock this down.
                  </div>
                )}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Admin token</label>
                  <input
                    type="password"
                    value={token}
                    onChange={e => setToken(e.target.value)}
                    placeholder="Paste your admin token"
                    autoFocus
                    className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-cyan-400/40 focus:outline-none"
                  />
                </div>
                {error && <p className="text-xs text-red-400">{error}</p>}
                <button
                  type="submit"
                  disabled={loading || !token.trim()}
                  className="flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-black hover:bg-cyan-400 disabled:opacity-50"
                >
                  <LogIn className="h-4 w-4" /> {loading ? "Signing in…" : "Sign in"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-white/5 bg-white/[0.01] p-4 text-xs text-zinc-500 leading-relaxed">
        <p className="font-semibold text-zinc-300 mb-1">About PlayBeat M3U</p>
        A focused IPTV playlist manager. Create playlists, add channels with stream URLs / logos /
        EPG metadata, organize by category, import existing M3U files, and export back as M3U8.
        No storefront, no payments, no other modules.
      </div>
    </div>
  )
}
