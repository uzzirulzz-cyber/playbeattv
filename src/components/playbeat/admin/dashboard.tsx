"use client"

import { useEffect, useState } from "react"

export function AdminDashboard() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/admin/stats").then(r => r.json()).then(setStats).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-zinc-500">Loading stats…</div>
  if (!stats) return <div className="text-zinc-500">No stats available.</div>

  const cards = [
    { label: "Total Content",    value: stats.content?.total,    sub: `${stats.content?.published || 0} published` },
    { label: "Series",           value: stats.series?.total,     sub: `${stats.episodes?.total || 0} episodes` },
    { label: "Imports Today",    value: stats.imports?.jobsToday, sub: `${stats.imports?.importsToday || 0} jobs total` },
    { label: "License Verified", value: stats.license?.verified, sub: `${stats.license?.review || 0} need review` },
    { label: "Pending Review",   value: stats.license?.review,   sub: `${stats.license?.rejected || 0} rejected` },
    { label: "Import Errors",    value: stats.imports?.errors,    sub: "all-time failures" },
  ]

  const last24 = stats.imports?.last24h || {}
  const l24 = [
    { label: "Discovered",    value: last24.discovered || 0 },
    { label: "Imported",      value: last24.imported || 0 },
    { label: "Published",    value: last24.published || 0 },
    { label: "Duplicates",   value: last24.duplicates || 0 },
    { label: "Rejected",     value: last24.rejected || 0 },
    { label: "Review",       value: last24.reviewRequired || 0 },
    { label: "Errors",       value: last24.errors || 0 },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-bold text-white">Overview</h2>
        <div className="mt-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {cards.map(c => (
            <div key={c.label} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-2xl font-extrabold text-white">{c.value ?? 0}</div>
              <div className="text-xs font-medium text-zinc-300 mt-1">{c.label}</div>
              <div className="text-[10px] text-zinc-500 mt-0.5">{c.sub}</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-bold text-white">Last 24 hours</h2>
        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {l24.map(c => (
            <div key={c.label} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <div className="text-xl font-bold text-cyan-300">{c.value}</div>
              <div className="text-[10px] text-zinc-400">{c.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-bold text-white">By Source</h2>
        <div className="mt-3 space-y-2">
          {(stats.bySource || []).map((s: any) => (
            <div key={s.provider} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
              <div className="flex-1">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-semibold capitalize text-white">{s.provider}</span>
                  <span className="text-sm text-zinc-400">{s.count}</span>
                </div>
                <div className="mt-1 h-1.5 w-full rounded bg-zinc-800">
                  <div className="h-full rounded bg-cyan-400" style={{ width: `${Math.min(100, s.count * 5)}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-amber-400/20 bg-amber-500/[0.04] p-4">
        <h3 className="text-sm font-semibold text-amber-200">API Status</h3>
        <ul className="mt-2 space-y-1 text-xs">
          <li className="flex items-center gap-2">
            <Dot on={stats.youtube?.apiKeyConfigured} />
            <span className="text-zinc-300">YouTube Data API key configured</span>
          </li>
          <li className="flex items-center gap-2">
            <Dot on={stats.auth?.configured} />
            <span className="text-zinc-300">Admin auth token configured</span>
          </li>
        </ul>
        {!stats.youtube?.apiKeyConfigured && (
          <p className="mt-3 text-xs text-amber-200/70">
            Without a YouTube API key, YouTube imports won&apos;t work. Set <code className="rounded bg-black/30 px-1 py-0.5">YOUTUBE_API_KEY</code> in your environment.
          </p>
        )}
      </div>
    </div>
  )
}

function Dot({ on }: { on: boolean }) {
  return <span className={`inline-block h-2 w-2 rounded-full ${on ? "bg-emerald-400" : "bg-zinc-600"}`} />
}
