"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

export function AdminSeries() {
  const [series, setSeries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/admin/series").then(r => r.json()).then(d => setSeries(d.series || [])).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-12 text-zinc-500"><Loader2 className="h-6 w-6 animate-spin" /></div>
  if (series.length === 0) return <div className="py-12 text-center text-zinc-500">No series yet. Episodes are auto-grouped into series by their title patterns.</div>

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-white">Series</h2>
      {series.map(s => (
        <div key={s.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-start gap-3">
            <div className="h-16 w-28 shrink-0 overflow-hidden rounded bg-zinc-800">
              {s.poster && <img src={s.poster} alt="" className="h-full w-full object-cover" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{s.title}</p>
              <p className="mt-0.5 text-xs text-zinc-500">
                {s.episodesCount} episodes · {s.seasonsCount} season(s)
              </p>
              <p className="mt-1 text-xs text-zinc-400 line-clamp-2">{s.description}</p>
              <div className="mt-2 flex flex-wrap gap-1 text-[10px]">
                <span className="rounded px-1.5 py-0.5 bg-white/5 text-zinc-400 uppercase">{s.sourceProvider}</span>
                {s.published && <span className="rounded px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300">published</span>}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
