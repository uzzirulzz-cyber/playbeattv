"use client"

import { useState } from "react"
import { useApp } from "@/stores/app"

export function AdminLogin() {
  const { setAdmin, setView } = useApp()
  const [token, setToken] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError(null)
    const res = await fetch("/api/admin/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error || "Invalid token")
      setLoading(false)
      return
    }
    setAdmin(true)
    setView("admin")
  }

  return (
    <div className="mx-auto max-w-md px-4 py-20">
      <div className="rounded-2xl border border-violet-400/20 bg-violet-500/[0.04] p-8 backdrop-blur">
        <h1 className="text-2xl font-bold text-white">Admin Access</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Enter the admin token to access content import controls.
        </p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <input
            type="password"
            value={token}
            onChange={e => setToken(e.target.value)}
            placeholder="Admin token"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-violet-400/40 focus:outline-none"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-violet-500 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-400 disabled:opacity-50"
          >
            {loading ? "Verifying…" : "Enter Admin"}
          </button>
        </form>
        <p className="mt-4 text-xs text-zinc-500">
          The token is set in the <code className="rounded bg-white/10 px-1 py-0.5 text-zinc-300">ADMIN_TOKEN</code> environment variable.
          If unset, the system runs in dev mode (open access).
        </p>
      </div>
    </div>
  )
}
