"use client"

import { useEffect, useState } from "react"
import { useApp } from "@/stores/app"
import { Plus, Upload, Settings as SettingsIcon, ListMusic, LogIn, LogOut } from "lucide-react"

export function Header() {
  const { view, setView, isAdmin, setAdmin, openPlaylist } = useApp()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    fetch("/api/admin/status").then(r => r.json()).then(d => setAdmin(d.admin)).catch(() => {})
  }, [setAdmin])

  const logout = async () => {
    await fetch("/api/admin/status", { method: "DELETE" })
    setAdmin(false)
    setView("playlists")
  }

  return (
    <header
      className={`sticky top-0 z-50 transition-colors ${
        scrolled ? "bg-[#070912]/95 backdrop-blur-xl border-b border-white/5" : "bg-[#070912]"
      }`}
    >
      <div className="mx-auto flex max-w-[1400px] items-center gap-6 px-4 sm:px-8 py-4">
        <button onClick={() => { openPlaylist(""); setView("playlists") }} className="flex items-center gap-2 group shrink-0">
          <Wordmark />
        </button>
        <nav className="hidden md:flex items-center gap-1 text-sm">
          <NavBtn active={view === "playlists"} onClick={() => setView("playlists")}>
            <ListMusic className="inline-block h-3.5 w-3.5 mr-1.5 -mt-0.5" /> Playlists
          </NavBtn>
          <NavBtn active={view === "import"} onClick={() => setView("import")}>
            <Upload className="inline-block h-3.5 w-3.5 mr-1.5 -mt-0.5" /> Import
          </NavBtn>
          <NavBtn active={view === "settings"} onClick={() => setView("settings")}>
            <SettingsIcon className="inline-block h-3.5 w-3.5 mr-1.5 -mt-0.5" /> Settings
          </NavBtn>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {isAdmin ? (
            <button
              onClick={logout}
              className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-white/10"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          ) : (
            <button
              onClick={() => setView("settings")}
              className="flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/20"
            >
              <LogIn className="h-3.5 w-3.5" /> Admin sign in
            </button>
          )}
        </div>
      </div>

      {/* Mobile nav */}
      <div className="md:hidden flex items-center gap-1 px-4 pb-3 overflow-x-auto text-xs">
        <NavBtn active={view === "playlists"} onClick={() => setView("playlists")}>
          <ListMusic className="h-3.5 w-3.5" />
        </NavBtn>
        <NavBtn active={view === "import"} onClick={() => setView("import")}>
          <Upload className="h-3.5 w-3.5" />
        </NavBtn>
        <NavBtn active={view === "settings"} onClick={() => setView("settings")}>
          <SettingsIcon className="h-3.5 w-3.5" />
        </NavBtn>
      </div>
    </header>
  )
}

function NavBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full font-medium transition-colors whitespace-nowrap ${
        active ? "text-white bg-white/10" : "text-zinc-400 hover:text-zinc-100"
      }`}
    >
      {children}
    </button>
  )
}

function Wordmark() {
  return (
    <div className="flex items-baseline">
      <span className="text-lg font-extrabold tracking-tight text-white">play</span>
      <span className="mx-0.5 inline-block h-2.5 w-0.5 rounded-full bg-gradient-to-b from-cyan-400 to-violet-500 self-center" />
      <span className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-cyan-300 to-violet-300 bg-clip-text text-transparent">beat</span>
      <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">m3u</span>
    </div>
  )
}
