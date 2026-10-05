"use client"

import { useEffect, useState } from "react"
import { useApp } from "@/stores/app"
import { PlayerAdapter } from "./player"
import { LicenseBadge, formatDuration } from "./card"
import { useWatchlistSet } from "@/hooks/use-watchlist"
import { ArrowLeft, Plus, Check, Share2, ShieldCheck, AlertCircle } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface ContentDetail {
  id: string
  title: string
  slug: string
  type: string
  description: string
  poster?: string | null
  backdrop?: string | null
  releaseYear?: number | null
  duration?: number | null
  genres?: string[]
  languages?: string[]
  source: { provider: string; sourceId: string; originalUrl: string | null; embedUrl: string | null; streamUrl: string | null }
  license: { type: string; verified: boolean; status: string; attribution?: string | null; sourceUrl?: string | null; checkedAt?: string | null }
  views: number
  plays: number
  trendingScore: number
}

export function WatchView() {
  const { watchTarget, closePlayer } = useApp()
  const [content, setContent] = useState<ContentDetail | null>(null)
  const [series, setSeries] = useState<SeriesDetail | null>(null)
  const [episode, setEpisode] = useState<any | null>(null)
  const userId = useApp(s => s.ensureUserId())
  const { ids: watchlistIds, refresh: refreshWatchlist } = useWatchlistSet(userId)

  const targetId = content?.id || episode?.id || series?.id || ""
  const inList = targetId ? watchlistIds.has(targetId) : false

  // For IPTV channels, all data is on the watchTarget itself — no async fetch needed
  const isChannel = watchTarget?.kind === "channel"
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!watchTarget) return
    let cancel = false
    const t = watchTarget
    if (t.kind === "channel") {
      // No fetch needed — channel data is already on the watchTarget
      // Loading state is reset by the remount via key on WatchView
      return
    }
    if (t.kind === "content") {
      fetch(`/api/content/${t.slug}`).then(r => r.ok ? r.json() : null).then(d => {
        if (cancel) return
        setContent(d)
      }).finally(() => !cancel && setLoading(false))
    } else if (t.kind === "series") {
      fetch(`/api/series/${t.slug}`).then(r => r.ok ? r.json() : null).then(d => {
        if (cancel) return
        setSeries(d)
        if (d && d.seasons?.length > 0) {
          const season = d.seasons.find(s => s.seasonNumber === (t.season || 1)) || d.seasons[0]
          if (season.episodes?.length > 0) {
            const ep = season.episodes.find(e => e.episodeNumber === (t.episode || 1)) || season.episodes[0]
            setEpisode(ep)
          }
        }
      }).finally(() => !cancel && setLoading(false))
    }
    return () => { cancel = true }
  }, [watchTarget])

  // Pick the source for the player
  const target = (() => {
    if (content) {
      return {
        sourceProvider: content.source.provider,
        sourceId: content.source.sourceId,
        originalUrl: content.source.originalUrl,
        embedUrl: content.source.embedUrl,
        streamUrl: content.source.streamUrl,
        poster: content.backdrop || content.poster,
        title: content.title,
        durationSec: content.duration,
        contentId: content.id,
      }
    }
    if (episode) {
      return {
        sourceProvider: episode.source.provider,
        sourceId: episode.source.sourceId,
        originalUrl: episode.source.originalUrl,
        embedUrl: episode.source.embedUrl,
        streamUrl: episode.source.streamUrl,
        poster: episode.thumbnail || series?.backdrop,
        title: episode.title,
        durationSec: episode.duration,
        episodeId: episode.id,
        seriesId: series?.id,
      }
    }
    // IPTV channel — use the URL directly as streamUrl
    if (watchTarget?.kind === "channel") {
      return {
        sourceProvider: "iptv",
        sourceId: watchTarget.url,
        originalUrl: watchTarget.url,
        embedUrl: null,
        streamUrl: watchTarget.url,
        poster: watchTarget.logo || null,
        title: watchTarget.name,
      }
    }
    return null
  })()

  const toggleList = () => {
    const action = inList ? "remove" : "add"
    fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-pb-user": userId },
      body: JSON.stringify({
        action,
        contentId: content?.id,
        episodeId: episode?.id,
        seriesId: series?.id,
        itemId: inList ? (content?.id || episode?.id || series?.id) : undefined,
      }),
    }).then(() => refreshWatchlist()).catch(() => {})
  }

  const isBlocked = (target?.sourceProvider === "youtube" || target?.sourceProvider === "wikimedia")
    ? false
    : !target?.embedUrl && !target?.streamUrl

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-8 py-4">
      <button onClick={closePlayer} className="mb-4 flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {loading && !isChannel ? (
        <div className="space-y-4">
          <Skeleton className="aspect-video w-full rounded-xl" />
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : !target ? (
        <div className="py-20 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-zinc-600" />
          <p className="mt-4 text-zinc-400">This title is no longer available.</p>
          <button onClick={closePlayer} className="mt-3 rounded-full bg-white/10 px-5 py-2 text-sm text-white hover:bg-white/20">
            Back to browse
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Player */}
          <PlayerAdapter {...target} />

          {/* Title + meta */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                {target.title}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-zinc-400">
                {content?.releaseYear && <span>{content.releaseYear}</span>}
                {target.durationSec && <span>· {formatDuration(target.durationSec)}</span>}
                {content?.genres?.length ? <span>· {content.genres.join(", ")}</span> : null}
                {content?.languages?.length ? <span>· {content.languages.join(", ")}</span> : null}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={toggleList}
                className="flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
              >
                {inList ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {inList ? "On My List" : "Add to List"}
              </button>
              <button
                onClick={() => navigator.clipboard?.writeText(window.location.href)}
                className="flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
              >
                <Share2 className="h-4 w-4" /> Share
              </button>
            </div>
          </div>

          {/* License / attribution (skip for IPTV channels) */}
          {target.sourceProvider !== "iptv" && (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center gap-2 mb-1">
                <LicenseBadge status={(content?.license?.status || episode?.license?.status)} />
                <span className="text-xs text-zinc-500 capitalize">
                  {content?.license?.type || episode?.license?.type || "unknown license"}
                </span>
                {(content?.license?.status || episode?.license?.status) === "verified" && (
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                )}
              </div>
              {(content?.license?.attribution || episode?.license?.attribution) && (
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {content?.license?.attribution || episode?.license?.attribution}
                </p>
              )}
              {(content?.license?.sourceUrl || episode?.license?.sourceUrl) && (
                <a
                  href={content?.license?.sourceUrl || episode?.license?.sourceUrl || "#"}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-1 inline-block text-xs text-cyan-300 hover:text-cyan-200"
                >
                  View license source
                </a>
              )}
            </div>
          )}

          {/* IPTV channel notice */}
          {target.sourceProvider === "iptv" && (
            <div className="rounded-xl border border-amber-400/20 bg-amber-500/[0.04] p-4">
              <p className="text-xs text-amber-200/80">
                This is a <strong>premium IPTV channel</strong> streamed via the PlayBeat TV reseller integration. Streaming requires an active IPTV line.
              </p>
            </div>
          )}

          {/* Description */}
          {(content?.description || episode?.description || series?.description) && (
            <p className="text-sm text-zinc-300 leading-relaxed max-w-3xl">
              {content?.description || episode?.description || series?.description}
            </p>
          )}

          {/* Episode selector for series */}
          {series && (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">Episodes</h2>
              <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                {series.seasons?.flatMap((s: any) => s.episodes.map((ep: any) => ep)).map((ep: any) => (
                  <button
                    key={ep.id}
                    onClick={() => setEpisode(ep)}
                    className={`flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors ${
                      episode?.id === ep.id ? "bg-cyan-500/20 ring-1 ring-cyan-400/40" : "hover:bg-white/5"
                    }`}
                  >
                    {ep.thumbnail ? (
                       
                      <img src={ep.thumbnail} alt="" className="h-12 w-20 rounded object-cover" />
                    ) : (
                      <div className="h-12 w-20 rounded bg-zinc-800 flex items-center justify-center text-xs text-zinc-500">S{ep.seasonNumber}E{ep.episodeNumber}</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">
                        S{ep.seasonNumber} · E{ep.episodeNumber} — {ep.title}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {ep.duration ? formatDuration(ep.duration) : ""} {ep.license?.status && `· ${ep.license.status}`}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface SeriesDetail {
  id: string
  title: string
  slug: string
  description: string
  poster?: string | null
  backdrop?: string | null
  genres?: string[]
  languages?: string[]
  seasons: Array<{
    id: string
    seasonNumber: number
    title?: string
    episodes: Array<{
      id: string
      episodeNumber: number
      seasonNumber: number
      title: string
      slug: string
      description: string
      duration?: number | null
      thumbnail?: string | null
      source: { provider: string; sourceId: string; originalUrl: string | null; embedUrl: string | null; streamUrl: string | null }
      license: { type: string; verified: boolean; status: string; attribution?: string | null; sourceUrl?: string | null }
      published: boolean
      available: boolean
      views: number
      plays: number
    }>
  }>
}
