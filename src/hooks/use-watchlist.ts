"use client"

import { useEffect, useState, useCallback } from "react"

interface WatchlistItem {
  id: string
  contentId?: string | null
  seriesId?: string | null
  episodeId?: string | null
}

let cache: WatchlistItem[] | null = null
let pending: Promise<WatchlistItem[]> | null = null
const listeners = new Set<() => void>()

async function fetchList(userId: string): Promise<WatchlistItem[]> {
  if (cache) return cache
  if (pending) return pending
  pending = fetch("/api/watchlist", { headers: { "x-pb-user": userId } })
    .then(r => r.json())
    .then(d => {
      cache = d.items || []
      pending = null
      listeners.forEach(l => l())
      return cache!
    })
    .catch(() => { pending = null; return [] })
  return pending
}

function invalidate() {
  cache = null
  listeners.forEach(l => l())
}

// Hook: get a Set of item IDs the user has saved (by contentId/seriesId/episodeId)
export function useWatchlistSet(userId: string) {
  const [, force] = useState(0)
  const [ids, setIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    let cancel = false
    const listener = () => {
      if (cancel) return
      const next = new Set<string>()
      for (const it of cache || []) {
        if (it.contentId) next.add(it.contentId)
        if (it.seriesId) next.add(it.seriesId)
        if (it.episodeId) next.add(it.episodeId)
      }
      setIds(next)
    }
    listeners.add(listener)
    fetchList(userId).then(() => listener())
    return () => { cancel = true; listeners.delete(listener) }
  }, [userId])

  const refresh = useCallback(() => { invalidate(); fetchList(userId) }, [userId])
  return { ids, refresh }
}
