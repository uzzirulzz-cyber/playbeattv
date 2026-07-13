"use client";

import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Sidebar } from "@/components/iptv/sidebar";
import { Topbar } from "@/components/iptv/topbar";
import { HomeView } from "@/components/iptv/home-view";
import { BrowserView } from "@/components/iptv/browser-view";
import { FavoritesView } from "@/components/iptv/favorites-view";
import { HistoryView } from "@/components/iptv/history-view";
import { PlayerModal } from "@/components/iptv/player-modal";
import { SeriesDetailDialog } from "@/components/iptv/series-detail";
import { SettingsDialog } from "@/components/iptv/settings-dialog";
import { useAppStore } from "@/lib/store";
import { Radio, Github, ShieldCheck } from "lucide-react";

export default function Home() {
  const view = useAppStore((s) => s.view);
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <div className="hidden md:block">
          <div className="sticky top-0 h-screen">
            <Sidebar />
          </div>
        </div>

        {/* Mobile sidebar drawer */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-64 p-0">
            <Sidebar />
          </SheetContent>
        </Sheet>

        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-[1600px]">
              {view === "home" ? <HomeView /> : null}
              {view === "live" ? <BrowserView type="live" /> : null}
              {view === "movies" ? <BrowserView type="movie" /> : null}
              {view === "series" ? <BrowserView type="series" /> : null}
              {view === "favorites" ? <FavoritesView /> : null}
              {view === "history" ? <HistoryView /> : null}
            </div>
          </main>
        </div>
      </div>

      {/* Sticky footer */}
      <footer className="mt-auto border-t border-border bg-card/50 px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col items-center justify-between gap-3 sm:flex-row">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15 text-primary">
              <Radio className="h-4 w-4" />
            </div>
            <span>
              <span className="font-semibold text-foreground">HypoTV</span>{" "}
              IPTV Player · Xtream Codes
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5" />
              Streams proxied via secure API
            </span>
            <span className="hidden sm:inline">
              Use responsibly with content you are authorized to access.
            </span>
          </div>
        </div>
      </footer>

      {/* Overlays */}
      <PlayerModal />
      <SeriesDetailDialog />
      <SettingsDialog />
    </div>
  );
}
