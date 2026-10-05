"use client"

import { useEffect, useState } from "react"
import { Hero } from "./hero"
import { Rail, type RailData } from "./rail"
import { Skeleton } from "@/components/ui/skeleton"

export function HomeView() {
  const [rails, setRails] = useState<RailData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancel = false
    fetch("/api/homepage").then(r => r.json()).then(d => {
      if (cancel) return
      setRails(d.rows || [])
      setError(null)
    }).catch(e => setError(e.message || String(e))).finally(() => !cancel && setLoading(false))
    return () => { cancel = true }
  }, [])

  if (loading) {
    return (
      <div>
        <div className="h-[60vh] w-full bg-zinc-900" />
        <div className="space-y-6 py-6">
          {[0,1,2,3].map(i => (
            <div key={i} className="px-4 sm:px-8">
              <Skeleton className="h-5 w-32 mb-2" />
              <div className="flex gap-2.5">
                {[0,1,2,3,4,5].map(j => (
                  <Skeleton key={j} className="aspect-[2/3] w-[140px] sm:w-[160px] md:w-[180px] shrink-0 rounded-md" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="px-4 py-20 text-center text-zinc-400">
        <p>Could not load content.</p>
        <p className="mt-2 text-sm text-zinc-600">{error}</p>
      </div>
    )
  }

  const featuredItems = (rails.find(r => r.key === "featured")?.items || []).slice(0, 8)
  const fallbackItems = (rails.find(r => r.key === "trending_now")?.items || []).slice(0, 5)
  const heroItems = featuredItems.length > 0 ? featuredItems : fallbackItems

  return (
    <div>
      {heroItems.length > 0 && <Hero items={heroItems} />}
      <div className="space-y-2 py-6">
        {rails.map(rail => <Rail key={rail.id} rail={rail} />)}
      </div>
    </div>
  )
}
