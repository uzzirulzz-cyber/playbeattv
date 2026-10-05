"use client"

import { useState } from "react"
import { useApp } from "@/stores/app"
import { Play, Plus, Check } from "lucide-react"
import { useWatchlistSet } from "@/hooks/use-watchlist"

export interface ContentCardData {
  id: string
  title: string
  slug: string
  type?: string
  poster?: string | null
  backdrop?: string | null
  releaseYear?: number | null
  duration?: number | null
  genres?: string[]
  languages?: string[]
  license?: { status?: string; type?: string; attribution?: string | null }
  episodesCount?: number
  trendingScore?: number
  series?: { title: string; slug: string }
  seasonNumber?: number
  episodeNumber?: number
  source?: { provider?: string }
}

export function ContentCard({ item }: { item: ContentCardData }) {
  const { watchContent, watchSeries } = useApp()
  const [hover, setHover] = useState(false)
  const userId = useApp(s => s.ensureUserId())
  const { ids: watchlistIds, refresh: refreshWatchlist } = useWatchlistSet(userId)
  const inList = watchlistIds.has(item.id)

  const open = () => {
    if (item.type === "series" || item.episodesCount != null) {
      watchSeries(item.slug)
    } else if (item.type === "episode" && item.series) {
      watchSeries(item.series.slug, item.seasonNumber, item.episodeNumber)
    } else {
      watchContent(item.slug)
    }
  }

  const toggleList = (e: React.MouseEvent) => {
    e.stopPropagation()
    const action = inList ? "remove" : "add"
    fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-pb-user": userId },
      body: JSON.stringify({
        action,
        contentId: item.type !== "series" && item.type !== "episode" ? item.id : null,
        seriesId: item.type === "series" || item.episodesCount != null ? item.id : null,
        episodeId: item.type === "episode" ? item.id : null,
        itemId: inList ? item.id : undefined,
      }),
    }).then(() => refreshWatchlist()).catch(() => {})
  }

  const isEpisode = item.type === "episode"
  const poster = item.poster || item.backdrop
  const fallbackBg = pickFallback(item.title)

  return (
    <div
      className="group relative aspect-[2/3] w-full cursor-pointer overflow-hidden rounded-md border border-white/5 bg-zinc-900 transition-all hover:scale-[1.04] hover:z-10 hover:border-cyan-400/30"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={open}
    >
      {poster ? (
         
        <img src={poster} alt={item.title} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center p-3 text-center" style={{ background: fallbackBg }}>
          <span className="text-xs font-bold uppercase tracking-wider text-white/80 line-clamp-3">{item.title}</span>
        </div>
      )}

      {/* Bottom gradient + title overlay (always visible) */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/60 to-transparent p-3 pt-8">
        <p className="text-sm font-semibold text-white line-clamp-2 leading-tight">{item.title}</p>
        <div className="mt-1 flex items-center gap-1.5 text-[10px] text-zinc-400">
          {item.releaseYear && <span>{item.releaseYear}</span>}
          {item.releaseYear && item.duration ? <span>·</span> : null}
          {item.duration && <span>{formatDuration(item.duration)}</span>}
          {item.episodesCount != null && <span>· {item.episodesCount} ep</span>}
          {isEpisode && item.series && <span>· S{item.seasonNumber} E{item.episodeNumber}</span>}
        </div>
      </div>

      {/* License badge (top-left, always) */}
      <div className="absolute top-2 left-2">
        <LicenseBadge status={item.license?.status} type={item.license?.type} />
      </div>

      {/* Hover actions */}
      {hover && (
        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3 p-4">
          <button
            onClick={open}
            className="flex items-center gap-2 rounded-full bg-white px-5 py-2 text-sm font-bold text-black hover:bg-cyan-300"
          >
            <Play className="h-4 w-4 fill-black" /> Play
          </button>
          <button
            onClick={toggleList}
            className="flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-xs font-semibold text-white backdrop-blur hover:bg-white/20"
          >
            {inList ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {inList ? "On My List" : "Add to List"}
          </button>
          {item.genres && item.genres.length > 0 && (
            <p className="text-[10px] text-zinc-400">{item.genres.slice(0, 3).join(" · ")}</p>
          )}
        </div>
      )}
    </div>
  )
}

export function LicenseBadge({ status, type }: { status?: string; type?: string }) {
  if (!status) return null
  const map: Record<string, { label: string; cls: string }> = {
    verified:  { label: "Free",   cls: "bg-emerald-500/90 text-white" },
    review:   { label: "Review", cls: "bg-amber-500/90 text-black" },
    rejected: { label: "Blocked", cls: "bg-red-500/90 text-white" },
  }
  const s = map[status] || map.review
  return (
    <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${s.cls}`}>
      {s.label}
    </span>
  )
}

export function formatDuration(sec: number | null | undefined): string {
  if (!sec) return ""
  if (sec < 60) return `${sec}s`
  const m = Math.floor(sec / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  return `${h}h ${m % 60}m`
}

// Deterministic gradient for items without posters — based on title hash
const GRADIENTS = [
  "linear-gradient(135deg, #1e293b 0%, #312e81 100%)",
  "linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)",
  "linear-gradient(135deg, #1a1a2e 0%, #5b21b6 100%)",
  "linear-gradient(135deg, #0c0a09 0%, #7c2d12 100%)",
  "linear-gradient(135deg, #13111c 0%, #6d28d9 100%)",
  "linear-gradient(135deg, #07171f 0%, #1e40af 100%)",
  "linear-gradient(135deg, #1c1917 0%, #155e75 100%)",
]
function pickFallback(title: string): string {
  let h = 0
  for (const c of title) h = (h * 31 + c.charCodeAt(0)) | 0
  return GRADIENTS[Math.abs(h) % GRADIENTS.length]
}
