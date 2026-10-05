"use client"

import { useState } from "react"
import { Loader2, CheckCircle2, XCircle, Link2 } from "lucide-react"

export function AdminImportUrl() {
  const [url, setUrl] = useState("")
  const [source, setSource] = useState<"youtube" | "wikimedia" | "direct" | "auto">("auto")
  const [declaredLicense, setDeclaredLicense] = useState("")
  const [attribution, setAttribution] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return
    setLoading(true); setResult(null); setError(null)
    try {
      const res = await fetch("/api/admin/import/url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          source: source === "auto" ? undefined : source,
          declaredLicense: declaredLicense || undefined,
          attribution: attribution || undefined,
        }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || "Import failed")
      setResult(d)
    } catch (e: any) {
      setError(e.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white">Quick Import</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Paste any YouTube URL, Wikimedia Commons file URL, or direct stream URL. The system will fetch metadata, detect the license, and add the title.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4 rounded-xl border border-white/10 bg-white/[0.03] p-6">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">URL</label>
          <div className="mt-1 flex gap-2">
            <div className="relative flex-1">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <input
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=… or https://commons.wikimedia.org/wiki/File:…"
                className="w-full rounded-lg border border-white/10 bg-white/5 pl-9 pr-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-cyan-400/40 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !url}
              className="rounded-lg bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-black hover:bg-cyan-400 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Import"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Source override</label>
            <select
              value={source}
              onChange={e => setSource(e.target.value as any)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:border-cyan-400/40 focus:outline-none"
            >
              <option value="auto">Auto-detect</option>
              <option value="youtube">YouTube</option>
              <option value="wikimedia">Wikimedia Commons</option>
              <option value="direct">Direct stream URL</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Declared license (direct only)</label>
            <select
              value={declaredLicense}
              onChange={e => setDeclaredLicense(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:border-cyan-400/40 focus:outline-none"
            >
              <option value="">— none —</option>
              <option value="public_domain">Public Domain</option>
              <option value="cc0">CC0</option>
              <option value="cc_by">CC BY</option>
              <option value="cc_by_sa">CC BY-SA</option>
              <option value="playbeat">PlayBeat-owned</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Attribution text (CC BY / CC BY-SA)</label>
          <textarea
            value={attribution}
            onChange={e => setAttribution(e.target.value)}
            rows={2}
            placeholder="Provided under CC BY 4.0 by …"
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-cyan-400/40 focus:outline-none"
          />
        </div>
      </form>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-300">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Import failed</p>
            <p className="mt-1 text-xs">{error}</p>
          </div>
        </div>
      )}

      {result && (
        <div className={`flex items-start gap-2 rounded-lg border p-4 text-sm ${result.ok ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300" : "border-amber-400/30 bg-amber-500/10 text-amber-300"}`}>
          {result.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0" />}
          <div>
            <p className="font-semibold">{result.ok ? "Imported" : "Not imported"}</p>
            <p className="mt-1 text-xs">{result.reason}</p>
            {result.contentId && <p className="mt-1 text-xs">Content ID: <code className="rounded bg-black/30 px-1 py-0.5">{result.contentId}</code></p>}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-xs text-zinc-400">
        <p className="font-semibold text-zinc-300 mb-1">What this does</p>
        <ul className="list-disc pl-4 space-y-1">
          <li>Fetches real metadata from the source (YouTube Data API or Wikimedia Commons API)</li>
          <li>Verifies license — auto-publishes only if Verified; otherwise saves as Review Required</li>
          <li>Checks for duplicates by source ID and normalized title + year</li>
          <li>Detects type (movie, episode, short, documentary, animation) and classifies genres + language</li>
          <li>Generates slug, SEO metadata, and writes an audit log entry</li>
        </ul>
      </div>
    </div>
  )
}
