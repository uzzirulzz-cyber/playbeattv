"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

export type View = "playlists" | "playlist" | "import" | "settings"

interface AppState {
  view: View
  currentPlaylistId: string | null
  search: string
  categoryFilter: string | null
  isAdmin: boolean

  setView: (v: View) => void
  openPlaylist: (id: string) => void
  closePlaylist: () => void
  setSearch: (q: string) => void
  setCategoryFilter: (c: string | null) => void
  setAdmin: (v: boolean) => void
}

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      view: "playlists",
      currentPlaylistId: null,
      search: "",
      categoryFilter: null,
      isAdmin: false,
      setView: (v) => set({ view: v, currentPlaylistId: v === "playlist" ? get().currentPlaylistId : null }),
      openPlaylist: (id) => set({ view: "playlist", currentPlaylistId: id, search: "", categoryFilter: null }),
      closePlaylist: () => set({ view: "playlists", currentPlaylistId: null, search: "", categoryFilter: null }),
      setSearch: (q) => set({ search: q }),
      setCategoryFilter: (c) => set({ categoryFilter: c }),
      setAdmin: (v) => set({ isAdmin: v }),
    }),
    {
      name: "pb-state",
      partialize: (s) => ({ isAdmin: s.isAdmin }),
    }
  )
)
