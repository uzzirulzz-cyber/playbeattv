"use client"

import { useEffect, useState } from "react"
import { useApp } from "@/stores/app"
import { Loader2, Tv, AlertCircle, ExternalLink, Filter } from "lucide-react"

interface IptvChannel {
  name: string
  logo?: string
  group?: string
  url: string
  type: "live" | "vod" | "series"
}

interface IptvGroup {
  name: string
  count: number
}

export function LiveView() {
  const { watchChannel } = useApp()
  const [channels, setChannels] = useState<IptvChannel[]>([])
  const [groups, setGroups] = useState<IptvGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [demo, setDemo] = useState(false)
  const [lineId, setLineId] = useState<string | null>(null)
  const [lineLabel, setLineLabel] = useState<string>("")
  const [filter, setFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [q, setQ] = useState("")

  useEffect(() => {
    let cancel = false
    const params = new URLSearchParams({ lineId: "demo" })
    if (filter !== "all") params.set("group", filter)
    if (typeFilter !== "all") params.set("type", typeFilter)
    if (q) params.set("q", q)
    fetch(`/api/iptv/channels?${params}`)
      .then(r => r.json())
      .then(d => {
        if (cancel) return
        setChannels(d.channels || [])
        setGroups(d.groups || [])
        setDemo(d.demo)
        setError(d.error)
        setLineId(d.lineId || null)
        setLineLabel(d.lineLabel || "")
      })
      .catch(e => setError(e.message || String(e)))
      .finally(() => !cancel && setLoading(false))
    return () => { cancel = true }
  }, [filter, typeFilter, q])

  return (
    <div className="mx-auto max-w-[1600px] px-4 sm:px-8 py-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <Tv className="h-7 w-7 text-amber-300" />
          <div>
            <h1 className="text-2xl font-bold text-white">Premium Live TV</h1>
            <p className="mt-0.5 text-sm text-zinc-500">
              {demo
                ? "Demo preview — sample channels. Connect an IPTV line to stream your full bouquet."
                : lineLabel
                  ? `Streaming from line "${lineLabel}" · ${channels.length} channels`
                  : "Streaming from your active IPTV line."}
            </p>
          </div>
        </div>
        {lineId && (
          <a
            href={`/api/iptv/webplayer/${lineId}`}
            target="_blank"
            rel="noreferrer noopener"
            className="flex items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-500/20"
            title="Open the Xtream Masters web player with your line's credentials pre-filled"
          >
            <ExternalLink className="h-4 w-4" />
            Open in Web Player
          </a>
        )}
      </div>

      {/* Info banner explaining the web player option */}
      {lineId && (
        <div className="mb-4 rounded-xl border border-amber-400/20 bg-amber-500/[0.04] p-3 text-xs text-amber-200/80">
          <strong className="text-amber-200">Two ways to watch:</strong> Use the in-app grid below for quick channel surfing, or click
          <strong className="text-amber-200"> Open in Web Player</strong> above for the full upstream player with EPG, VOD browser, series, and multi-screen switching.
        </div>
      )}

      {/* Filter bar */}
      <div className="mb-6 space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-zinc-500 font-medium">Group:</span>
          <button
            onClick={() => setFilter("all")}
            className={`rounded-full px-3 py-1 ${filter === "all" ? "bg-amber-500/20 text-amber-200 ring-1 ring-amber-400/40" : "bg-white/5 text-zinc-400 hover:bg-white/10"}`}
          >
            All ({groups.reduce((s, g) => s + g.count, 0)})
          </button>
          {groups.map(g => (
            <button
              key={g.name}
              onClick={() => setFilter(g.name)}
              className={`rounded-full px-3 py-1 ${filter === g.name ? "bg-amber-500/20 text-amber-200 ring-1 ring-amber-400/40" : "bg-white/5 text-zinc-400 hover:bg-white/10"}`}
            >
              {g.name} ({g.count})
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-zinc-500 font-medium">Type:</span>
          {["all", "live", "vod", "series"].map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`rounded-full px-3 py-1 uppercase ${typeFilter === t ? "bg-white/15 text-white" : "bg-white/5 text-zinc-400 hover:bg-white/10"}`}
            >
              {t}
            </button>
          ))}
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search channels…"
            className="ml-auto rounded-full bg-white/5 border border-white/10 px-3 py-1 text-sm text-white placeholder-zinc-500 w-full sm:w-64"
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12 text-zinc-500"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : channels.length === 0 ? (
        <div className="py-12 text-center text-zinc-500">
          <AlertCircle className="mx-auto h-10 w-10 text-zinc-600" />
          <p className="mt-3">No channels found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {channels.map((c, i) => (
            <button
              key={`${c.url}-${i}`}
              onClick={() => watchChannel(c.url, c.name, c.logo)}
              className="group relative aspect-video w-full overflow-hidden rounded-md border border-white/5 bg-zinc-900 hover:border-amber-400/30 hover:scale-[1.03] transition-all"
            >
              {c.logo ? (
                <img src={c.logo} alt="" className="absolute inset-0 h-full w-full object-contain p-3 opacity-70 group-hover:opacity-90" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900 p-2">
                  <Tv className="h-8 w-8 text-zinc-600" />
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black to-transparent p-2 pt-6">
                <p className="text-xs font-semibold text-white line-clamp-2 leading-tight">{c.name}</p>
                {c.group && <p className="text-[10px] text-zinc-500">{c.group}</p>}
              </div>
              <div className="absolute top-2 right-2">
                <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                  c.type === "live" ? "bg-red-500 text-white" :
                  c.type === "vod" ? "bg-cyan-500 text-black" :
                  "bg-violet-500 text-white"
                }`}>
                  {c.type}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
