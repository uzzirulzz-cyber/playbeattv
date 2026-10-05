"use client"

import { useEffect, useState } from "react"
import { useApp } from "@/stores/app"
import { ContentCard, type ContentCardData } from "./card"
import { Skeleton } from "@/components/ui/skeleton"

interface WatchlistResponse {
  items: Array<{
    id: string
    addedAt: string
    content?: ContentCardData
    series?: ContentCardData
    episode?: ContentCardData
  }>
}

export function MyListView() {
  const userId = useApp(s => s.ensureUserId())
  const { watchContent, watchSeries, view } = useApp()
  const [items, setItems] = useState<WatchlistResponse["items"]>([])
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState<any[]>([])

  useEffect(() => {
    if (view !== "mylist") return
    let cancel = false
    Promise.all([
      fetch("/api/watchlist", { headers: { "x-pb-user": userId } }).then(r => r.json()),
      fetch("/api/watch-progress", { headers: { "x-pb-user": userId } }).then(r => r.json()),
    ]).then(([w, p]) => {
      if (cancel) return
      setItems(w.items || [])
      setProgress(p.items || [])
    }).finally(() => !cancel && setLoading(false))
    return () => { cancel = true }
  }, [userId, view])

  // Continue watching — items with progress > 0 and < 95%
  const continueWatching = progress
    .filter(p => p.percentage > 0 && p.percentage < 95)
    .slice(0, 12)

  const allItems = items
    .map(i => i.content || i.series || i.episode)
    .filter(Boolean) as ContentCardData[]

  return (
    <div className="mx-auto max-w-[1600px] px-4 sm:px-8 py-6">
      <h1 className="mb-6 text-2xl font-bold text-white">My List</h1>

      {continueWatching.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">Continue watching</h2>
          <div className="space-y-2">
            {continueWatching.map(p => (
              <ContinueCard key={p.id} item={p} />
            ))}
          </div>
        </section>
      )}

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2.5">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="aspect-[2/3] w-full rounded-md" />)}
        </div>
      ) : allItems.length === 0 ? (
        <div className="py-20 text-center text-zinc-400">
          <p>Your list is empty.</p>
          <p className="mt-2 text-sm text-zinc-600">Browse and tap &ldquo;Add to List&rdquo; on titles you want to save.</p>
        </div>
      ) : (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">Saved ({allItems.length})</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2.5">
            {allItems.map(it => (
              <ContentCard key={it.id} item={it} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ContinueCard({ item }: { item: any }) {
  const { watchContent, watchSeries } = useApp()
  const open = () => {
    if (item.episode?.series?.slug) {
      watchSeries(item.episode.series.slug, item.episode.seasonNumber, item.episode.episodeNumber)
    } else if (item.content?.slug) {
      watchContent(item.content.slug)
    }
  }
  return (
    <button
      onClick={open}
      className="group flex w-full items-center gap-3 rounded-lg border border-white/5 bg-white/5 p-3 text-left hover:bg-white/10"
    >
      {(item.episode?.thumbnail || item.content?.poster) ? (
         
        <img src={item.episode?.thumbnail || item.content?.poster} alt="" className="h-12 w-20 rounded object-cover" />
      ) : (
        <div className="h-12 w-20 rounded bg-zinc-800" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">
          {item.episode?.title || item.content?.title || "Untitled"}
        </p>
        <p className="text-xs text-zinc-500">
          {item.episode?.series?.title ? `${item.episode.series.title} · ` : ""}
          {item.percentage}% watched
        </p>
        <div className="mt-1.5 h-1 w-full overflow-hidden rounded bg-zinc-700">
          <div className="h-full bg-cyan-400" style={{ width: `${item.percentage}%` }} />
        </div>
      </div>
    </button>
  )
}
