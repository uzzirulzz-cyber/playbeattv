"use client"

import { useEffect, useState } from "react"
import { Play, Info, ShieldCheck } from "lucide-react"
import { useApp } from "@/stores/app"
import { ContentCard, type ContentCardData, formatDuration } from "./card"

export function Hero({ items }: { items: ContentCardData[] }) {
  const { watchContent, watchSeries } = useApp()
  const [idx, setIdx] = useState(0)
  const featured = items[idx] || items[0]

  useEffect(() => {
    if (items.length <= 1) return
    const t = setInterval(() => setIdx(i => (i + 1) % Math.min(items.length, 5)), 8000)
    return () => clearInterval(t)
  }, [items.length])

  if (!featured) return null

  const open = () => {
    if (featured.type === "series" || featured.episodesCount != null) {
      watchSeries(featured.slug)
    } else {
      watchContent(featured.slug)
    }
  }

  return (
    <section className="relative -mt-[88px] h-[85vh] min-h-[600px] w-full overflow-hidden">
      {/* Backdrop */}
      <div className="absolute inset-0">
        {(featured.backdrop || featured.poster) && (
           
          <img
            src={featured.backdrop || featured.poster || ""}
            alt=""
            className="h-full w-full object-cover opacity-60"
            style={{ objectPosition: "center top" }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#070912] via-transparent to-black/40" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex h-full items-end pb-20">
        <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-8">
          <div className="max-w-2xl space-y-4">
            <div className="flex items-center gap-2 text-xs">
              {featured.license?.status === "verified" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-1 text-emerald-300 ring-1 ring-emerald-400/30">
                  <ShieldCheck className="h-3 w-3" />
                  Free & Legal
                </span>
              )}
              {featured.genres && featured.genres.length > 0 && (
                <span className="text-zinc-400">{featured.genres.slice(0, 2).join(" · ")}</span>
              )}
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white drop-shadow-lg">
              {featured.title}
            </h1>
            <div className="flex items-center gap-3 text-sm text-zinc-300">
              {featured.releaseYear && <span>{featured.releaseYear}</span>}
              {featured.duration && <span>{formatDuration(featured.duration)}</span>}
              {featured.episodesCount != null && <span>{featured.episodesCount} episodes</span>}
              {featured.languages && featured.languages.length > 0 && (
                <span className="text-zinc-500">{featured.languages[0]}</span>
              )}
            </div>
            {featured.license?.attribution && (
              <p className="text-xs text-zinc-500 line-clamp-1">{featured.license.attribution}</p>
            )}
            <p className="text-sm text-zinc-300 line-clamp-2 max-w-xl">{featured.description || ""}</p>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={open}
                className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-bold text-black hover:bg-cyan-300"
              >
                <Play className="h-4 w-4 fill-black" /> Play now
              </button>
              <button
                onClick={() => useApp.getState().setView("browse")}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-5 py-3 text-sm font-semibold text-white backdrop-blur hover:bg-white/10"
              >
                <Info className="h-4 w-4" /> Browse all
              </button>
            </div>
          </div>

          {/* Hero thumbnails */}
          {items.length > 1 && (
            <div className="mt-10 hidden lg:flex items-center gap-2">
              {items.slice(0, 8).map((it, i) => (
                <button
                  key={it.id}
                  onClick={() => setIdx(i)}
                  className={`relative h-16 w-28 overflow-hidden rounded-md border-2 transition-all ${
                    i === idx ? "border-cyan-400 opacity-100" : "border-white/10 opacity-50 hover:opacity-80"
                  }`}
                >
                  {it.poster ? (
                     
                    <img src={it.poster} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-zinc-900 text-[10px] text-zinc-400">
                      {it.title.slice(0, 20)}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
