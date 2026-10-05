"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

export type View = "home" | "browse" | "search" | "mylist" | "watch" | "admin"
export type AdminView = "dashboard" | "import-url" | "import-search" | "import-bulk" | "content" | "audit" | "settings" | "queries" | "rows" | "series"
export type WatchTarget =
  | { kind: "content"; slug: string }
  | { kind: "series"; slug: string; season?: number; episode?: number }
  | null

export interface BrowseFilter {
  type: string
  genre?: string
  language?: string
  sort: string
}

interface AppState {
  view: View
  adminView: AdminView
  watchTarget: WatchTarget
  browse: BrowseFilter
  search: string
  isAdmin: boolean
  userId: string

  setView: (v: View) => void
  setAdminView: (v: AdminView) => void
  watchContent: (slug: string) => void
  watchSeries: (slug: string, season?: number, episode?: number) => void
  closePlayer: () => void
  setBrowse: (b: Partial<BrowseFilter>) => void
  setSearch: (q: string) => void
  setAdmin: (v: boolean) => void
  ensureUserId: () => string
}

function genUserId(): string {
  return "anon-" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      view: "home",
      adminView: "dashboard",
      watchTarget: null,
      browse: { type: "all", sort: "trending" },
      search: "",
      isAdmin: false,
      userId: "",
      setView: (v) => set({ view: v }),
      setAdminView: (v) => set({ adminView: v }),
      watchContent: (slug) => set({ view: "watch", watchTarget: { kind: "content", slug } }),
      watchSeries: (slug, season, episode) =>
        set({ view: "watch", watchTarget: { kind: "series", slug, season, episode } }),
      closePlayer: () => set({ view: "home", watchTarget: null }),
      setBrowse: (b) => set({ browse: { ...get().browse, ...b }, view: "browse" }),
      setSearch: (q) => set({ search: q, view: q ? "search" : "home" }),
      setAdmin: (v) => set({ isAdmin: v }),
      ensureUserId: () => {
        const cur = get().userId
        if (cur) return cur
        const next = genUserId()
        set({ userId: next })
        return next
      },
    }),
    {
      name: "pb-state",
      partialize: (s) => ({ userId: s.userId, isAdmin: s.isAdmin }),
    }
  )
)
