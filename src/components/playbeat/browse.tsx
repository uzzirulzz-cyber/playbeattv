"use client"

import { useEffect, useState } from "react"
import { useApp } from "@/stores/app"
import { ContentCard, type ContentCardData } from "./card"
import { Skeleton } from "@/components/ui/skeleton"
import { GENRES, LANGUAGES } from "@/lib/import/classifier"

export function BrowseView() {
  const { browse, setBrowse } = useApp()
  const [items, setItems] = useState<ContentCardData[]>([])
  const [series, setSeries] = useState<ContentCardData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancel = false
    const params = new URLSearchParams({
      type: browse.type || "all",
      sort: browse.sort,
      limit: "48",
    })
    if (browse.genre) params.set("genre", browse.genre)
    if (browse.language) params.set("language", browse.language)
    fetch(`/api/content?${params}`).then(r => r.json()).then(d => {
      if (cancel) return
      setItems(d.content || [])
      setSeries(d.series || [])
    }).finally(() => !cancel && setLoading(false))
    return () => { cancel = true }
  }, [browse])

  return (
    <div className="mx-auto max-w-[1600px] px-4 sm:px-8 py-6">
      {/* Filter bar */}
      <div className="mb-6 flex flex-wrap items-center gap-2 text-xs">
        <FilterChips
          label="Type"
          value={browse.type}
          options={[
            { v: "all", l: "All" },
            { v: "movie", l: "Movies" },
            { v: "series", l: "Series" },
            { v: "documentary", l: "Documentaries" },
            { v: "animation", l: "Animation" },
            { v: "short", l: "Shorts" },
          ]}
          onChange={(v) => setBrowse({ type: v })}
        />
        <FilterChips
          label="Genre"
          value={browse.genre || "all"}
          options={[{ v: "all", l: "All" }, ...GENRES.map(g => ({ v: g, l: g }))]}
          onChange={(v) => setBrowse({ genre: v === "all" ? undefined : v })}
        />
        <FilterChips
          label="Language"
          value={browse.language || "all"}
          options={[{ v: "all", l: "All" }, ...LANGUAGES.map(l => ({ v: l, l: l }))]}
          onChange={(v) => setBrowse({ language: v === "all" ? undefined : v })}
        />
        <FilterChips
          label="Sort"
          value={browse.sort}
          options={[
            { v: "trending", l: "Trending" },
            { v: "recent", l: "Recent" },
            { v: "popular", l: "Most Watched" },
            { v: "featured", l: "Featured" },
          ]}
          onChange={(v) => setBrowse({ sort: v })}
        />
      </div>

      <h1 className="mb-4 text-2xl font-bold text-white capitalize">
        {browse.type === "all" ? "Browse" : browse.type + "s"}
        <span className="ml-3 text-sm font-normal text-zinc-500">
          {items.length + series.length} titles
        </span>
      </h1>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2.5">
          {[...Array(16)].map((_, i) => (
            <Skeleton key={i} className="aspect-[2/3] w-full rounded-md" />
          ))}
        </div>
      ) : items.length === 0 && series.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-zinc-400">No titles match these filters yet.</p>
          <p className="mt-2 text-sm text-zinc-600">Try adjusting filters or running an import from the Admin section.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2.5">
          {series.map(s => (
            <ContentCard key={`s-${s.id}`} item={s} />
          ))}
          {items.map(c => (
            <ContentCard key={`c-${c.id}`} item={c} />
          ))}
        </div>
      )}
    </div>
  )
}

function FilterChips({ label, value, options, onChange }: {
  label: string
  value: string
  options: { v: string; l: string }[]
  onChange: (v: string) => void
}) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto">
      <span className="text-zinc-500 font-medium shrink-0">{label}:</span>
      {options.map(o => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
            value === o.v ? "bg-white/15 text-white" : "bg-white/5 text-zinc-400 hover:bg-white/10"
          }`}
        >
          {o.l}
        </button>
      ))}
    </div>
  )
}
