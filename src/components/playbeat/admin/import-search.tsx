"use client"

import { useState } from "react"
import { Loader2, Search, Play } from "lucide-react"
import { LicenseBadge } from "../card"

interface PreviewItem {
  sourceId: string
  title: string
  description: string
  thumbnail: string | null
  duration: number | null
  license: { type: string; status: string; verified: boolean; reason: string }
  sourceProvider: string
  channelTitle?: string
  antiMoviePattern: boolean
  originalUrl: string | null
}

export function AdminImportSearch() {
  const [source, setSource] = useState<"youtube" | "wikimedia">("wikimedia")
  const [query, setQuery] = useState("")
  const [maxResults, setMaxResults] = useState(10)
  const [licenseFilter, setLicenseFilter] = useState("any")
  const [preview, setPreview] = useState<PreviewItem[]>([])
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [importResult, setImportResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const runPreview = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError(null); setPreview([]); setSelected(new Set())
    try {
      const res = await fetch(`/api/admin/import/bulk?source=${source}&query=${encodeURIComponent(query)}&maxResults=${maxResults}&licenseFilter=${licenseFilter}`)
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || "Preview failed")
      setPreview(d.items || [])
      if (d.items?.length === 0) setError("No items found. Try a different query.")
    } catch (e: any) {
      setError(e.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  const importSelected = async () => {
    if (selected.size === 0) return
    setImporting(true); setImportResult(null)
    try {
      // For each selected URL, call /api/admin/import/url
      const items = preview.filter(p => selected.has(p.sourceId))
      let ok = 0, failed = 0
      for (const item of items) {
        const res = await fetch("/api/admin/import/url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: item.originalUrl, source: item.sourceProvider }),
        })
        if (res.ok) ok++; else failed++
      }
      setImportResult({ ok, failed, total: items.length })
      setSelected(new Set())
    } finally {
      setImporting(false)
    }
  }

  const toggleSel = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id); else next.add(id)
    setSelected(next)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white">Search Import</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Discover content from YouTube or Wikimedia Commons by keyword, preview the license verdict, then choose which titles to import.
        </p>
      </div>

      <form onSubmit={runPreview} className="grid grid-cols-1 sm:grid-cols-4 gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Source</label>
          <select value={source} onChange={e => setSource(e.target.value as any)} className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white">
            <option value="wikimedia">Wikimedia Commons</option>
            <option value="youtube">YouTube</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Query</label>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="public domain film noir" className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-zinc-500" />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Max</label>
          <input type="number" min={1} max={50} value={maxResults} onChange={e => setMaxResults(parseInt(e.target.value || "10"))} className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white" />
        </div>
        <div className="sm:col-span-4 flex items-center justify-between">
          <select value={licenseFilter} onChange={e => setLicenseFilter(e.target.value)} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white">
            <option value="any">Any license</option>
            <option value="all_verified">Verified only</option>
            <option value="creative_commons">Creative Commons</option>
            <option value="public_domain">Public Domain</option>
          </select>
          <button type="submit" disabled={loading || !query} className="flex items-center gap-2 rounded-lg bg-cyan-500 px-5 py-2 text-sm font-semibold text-black hover:bg-cyan-400 disabled:opacity-50">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Preview
          </button>
        </div>
      </form>

      {error && <p className="text-sm text-amber-300">{error}</p>}

      {preview.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-300">
              {preview.length} discovered · {selected.size} selected
            </h3>
            <div className="flex gap-2">
              <button onClick={() => setSelected(new Set(preview.map(p => p.sourceId)))} className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white hover:bg-white/10">Select All</button>
              <button onClick={() => setSelected(new Set())} className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white hover:bg-white/10">Clear</button>
              <button
                onClick={importSelected}
                disabled={importing || selected.size === 0}
                className="flex items-center gap-2 rounded-md bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-black hover:bg-emerald-400 disabled:opacity-50"
              >
                {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                Import {selected.size > 0 ? `(${selected.size})` : ""}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {preview.map(item => (
              <button
                key={item.sourceId}
                onClick={() => toggleSel(item.sourceId)}
                className={`flex gap-3 rounded-lg border p-3 text-left transition-colors ${
                  selected.has(item.sourceId)
                    ? "border-cyan-400/50 bg-cyan-500/10"
                    : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                }`}
              >
                {item.thumbnail ? (
                   
                  <img src={item.thumbnail} alt="" className="h-20 w-32 shrink-0 rounded object-cover" />
                ) : (
                  <div className="h-20 w-32 shrink-0 rounded bg-zinc-800" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white line-clamp-2">{item.title}</p>
                  {item.channelTitle && <p className="text-[10px] text-zinc-500 mt-0.5">{item.channelTitle}</p>}
                  <div className="mt-1 flex items-center gap-1.5">
                    <LicenseBadge status={item.license.status} type={item.license.type} />
                    {item.duration && <span className="text-[10px] text-zinc-500">{Math.round(item.duration / 60)}m</span>}
                    {item.antiMoviePattern && <span className="text-[10px] text-red-400">⚠ anti-movie</span>}
                  </div>
                  <p className="mt-1 text-[10px] text-zinc-500 line-clamp-2">{item.license.reason}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {importResult && (
        <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
          Imported {importResult.ok} of {importResult.total} titles {importResult.failed > 0 && `(${importResult.failed} failed)`}.
        </div>
      )}
    </div>
  )
}
