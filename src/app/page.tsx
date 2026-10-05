"use client"

import { useApp } from "@/stores/app"
import { Header } from "@/components/playbeat/header"
import { Footer } from "@/components/playbeat/footer"
import { PlaylistsView } from "@/components/playbeat/playlists-view"
import { PlaylistDetailView } from "@/components/playbeat/playlist-detail"
import { ImportView } from "@/components/playbeat/import-view"
import { SettingsView } from "@/components/playbeat/settings-view"

export default function Page() {
  const view = useApp(s => s.view)
  const currentPlaylistId = useApp(s => s.currentPlaylistId)

  return (
    <div className="flex min-h-screen flex-col bg-[#070912] text-zinc-100">
      <Header />
      <main className="flex-1">
        {view === "playlists" && <PlaylistsView />}
        {view === "playlist" && currentPlaylistId && <PlaylistDetailView key={currentPlaylistId} playlistId={currentPlaylistId} />}
        {view === "import" && <ImportView />}
        {view === "settings" && <SettingsView />}
      </main>
      <Footer />
    </div>
  )
}
