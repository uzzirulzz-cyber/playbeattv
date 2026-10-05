"use client"

import { useEffect, useState } from "react"
import { useApp } from "@/stores/app"
import { ContentCard, type ContentCardData } from "./card"
import { Skeleton } from "@/components/ui/skeleton"

export function SearchView() {
  const { search } = useApp()
  const [content, setContent] = useState<ContentCardData[]>([])
  const [series, setSeries] = useState<ContentCardData[]>([])
  const [episodes, setEpisodes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!search) return
    let cancel = false
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(search)}`).then(r => r.json()).then(d => {
        if (cancel) return
        setContent(d.content || [])
        setSeries(d.series || [])
        setEpisodes(d.episodes || [])
      }).finally(() => !cancel && setLoading(false))
    }, 200) // debounce
    return () => { cancel = true; clearTimeout(t) }
  }, [search])

  return (
    <div className="mx-auto max-w-[1600px] px-4 sm:px-8 py-6">
      <h1 className="mb-6 text-2xl font-bold text-white">
        Results for <span className="text-cyan-300">&ldquo;{search}&rdquo;</span>
      </h1>
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2.5">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="aspect-[2/3] w-full rounded-md" />)}
        </div>
      ) : content.length === 0 && series.length === 0 && episodes.length === 0 ? (
        <div className="py-20 text-center text-zinc-400">
          <p>No titles found.</p>
          <p className="mt-2 text-sm">Try a different search term.</p>
        </div>
      ) : (
        <>
          {content.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">Movies & Videos</h2>
              <div className="mb-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2.5">
                {content.map(c => <ContentCard key={c.id} item={c} />)}
              </div>
            </div>
          )}
          {series.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">Series</h2>
              <div className="mb-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2.5">
                {series.map(s => <ContentCard key={s.id} item={s} />)}
              </div>
            </div>
          )}
          {episodes.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">Episodes</h2>
              <div className="space-y-2">
                {episodes.map(ep => (
                  <button
                    key={ep.id}
                    onClick={() => useApp.getState().watchSeries(ep.series.slug, ep.seasonNumber, ep.episodeNumber)}
                    className="flex w-full items-center gap-3 rounded-lg border border-white/5 bg-white/5 p-3 text-left hover:bg-white/10"
                  >
                    {ep.thumbnail ? (
                       
                      <img src={ep.thumbnail} alt="" className="h-12 w-20 rounded object-cover" />
                    ) : (
                      <div className="h-12 w-20 rounded bg-zinc-800" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white">{ep.title}</p>
                      <p className="text-xs text-zinc-500">
                        {ep.series.title} · S{ep.seasonNumber} E{ep.episodeNumber}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
