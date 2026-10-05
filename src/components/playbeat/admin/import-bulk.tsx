"use client"

import { useState } from "react"
import { Loader2, Zap } from "lucide-react"

export function AdminImportBulk() {
  const [source, setSource] = useState<"youtube" | "wikimedia">("wikimedia")
  const [contentType, setContentType] = useState("all")
  const [language, setLanguage] = useState("")
  const [licenseFilter, setLicenseFilter] = useState("all_verified")
  const [maxResults, setMaxResults] = useState(50)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const run = async () => {
    setLoading(true); setResult(null); setError(null)
    try {
      const res = await fetch("/api/admin/import/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source, contentType, language: language || undefined,
          licenseFilter, maxResults,
        }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || "Bulk import failed")
      setResult(d)
    } catch (e: any) {
      setError(e.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white">Bulk Discovery</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Runs every enabled query in your Source Query Library for the chosen source. Discovered items are deduped, classified, license-verified, and saved.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-6">
        <Field label="Source">
          <select value={source} onChange={e => setSource(e.target.value as any)} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white">
            <option value="wikimedia">Wikimedia Commons (no API key needed)</option>
            <option value="youtube">YouTube (requires API key)</option>
          </select>
        </Field>
        <Field label="Content type">
          <select value={contentType} onChange={e => setContentType(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white">
            <option value="all">All</option>
            <option value="movies">Movies</option>
            <option value="series">Series</option>
            <option value="documentaries">Documentaries</option>
            <option value="animation">Animation</option>
            <option value="shorts">Shorts</option>
          </select>
        </Field>
        <Field label="Language (optional)">
          <input value={language} onChange={e => setLanguage(e.target.value)} placeholder="English, Hindi…" className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-zinc-500" />
        </Field>
        <Field label="License filter">
          <select value={licenseFilter} onChange={e => setLicenseFilter(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white">
            <option value="all_verified">All verified</option>
            <option value="public_domain">Public Domain</option>
            <option value="creative_commons">Creative Commons</option>
            <option value="official_embeddable">Official embeddable</option>
            <option value="any">Any (review if unverified)</option>
          </select>
        </Field>
        <Field label="Max results per run">
          <select value={maxResults} onChange={e => setMaxResults(parseInt(e.target.value))} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white">
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={250}>250</option>
          </select>
        </Field>
        <div className="flex items-end">
          <button
            onClick={run}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-violet-500 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-400 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            Run Bulk Import
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-amber-300">{error}</p>}

      {result && (
        <div className="rounded-xl border border-violet-400/30 bg-violet-500/10 p-5">
          <h3 className="text-sm font-semibold text-violet-200">Import completed</h3>
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-center">
            <Stat label="Discovered" value={result.job?.discovered} color="text-cyan-300" />
            <Stat label="Imported" value={result.job?.imported} color="text-white" />
            <Stat label="Published" value={result.job?.published} color="text-emerald-300" />
            <Stat label="Duplicates" value={result.job?.duplicates} color="text-zinc-400" />
            <Stat label="Rejected" value={result.job?.rejected} color="text-red-300" />
            <Stat label="Review" value={result.job?.reviewRequired} color="text-amber-300" />
            <Stat label="Errors" value={result.job?.errors} color="text-red-300" />
          </div>
          <details className="mt-4">
            <summary className="cursor-pointer text-xs text-zinc-400 hover:text-zinc-200">Job log</summary>
            <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-black/40 p-3 text-[10px] text-zinc-300">
              {(result.job?.log || []).join("\n")}
            </pre>
          </details>
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: number | undefined; color: string }) {
  return (
    <div>
      <div className={`text-2xl font-bold ${color}`}>{value ?? 0}</div>
      <div className="text-[10px] text-zinc-400">{label}</div>
    </div>
  )
}
