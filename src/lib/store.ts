"use client";

import { create } from "zustand";
import type {
  PlayerState,
  SeriesDetailState,
  ViewId,
  AuthMode,
} from "@/lib/types";

interface AppState {
  view: ViewId;
  setView: (v: ViewId) => void;

  selectedCategoryId: string | "all";
  setSelectedCategoryId: (id: string | "all") => void;

  search: string;
  setSearch: (q: string) => void;

  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;

  authOpen: boolean;
  authMode: AuthMode;
  openAuth: (mode?: AuthMode) => void;
  closeAuth: () => void;

  player: PlayerState;
  openPlayer: (p: Omit<PlayerState, "open">) => void;
  closePlayer: () => void;

  seriesDetail: SeriesDetailState;
  openSeriesDetail: (s: Omit<SeriesDetailState, "open">) => void;
  closeSeriesDetail: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  view: "home",
  setView: (v) => set({ view: v, selectedCategoryId: "all", search: "" }),

  selectedCategoryId: "all",
  setSelectedCategoryId: (id) => set({ selectedCategoryId: id }),

  search: "",
  setSearch: (q) => set({ search: q }),

  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  authOpen: false,
  authMode: "signin",
  openAuth: (mode = "signin") => set({ authOpen: true, authMode: mode }),
  closeAuth: () => set({ authOpen: false }),

  player: {
    open: false,
    streamUrl: "",
    title: "",
    type: "live",
    streamId: "",
  },
  openPlayer: (p) => set({ player: { ...p, open: true } }),
  closePlayer: () =>
    set((state) => ({ player: { ...state.player, open: false } })),

  seriesDetail: { open: false, seriesId: null },
  openSeriesDetail: (s) => set({ seriesDetail: { ...s, open: true } }),
  closeSeriesDetail: () =>
    set((state) => ({ seriesDetail: { ...state.seriesDetail, open: false } })),
}));
