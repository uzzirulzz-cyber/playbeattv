"use client"

import { useEffect, useState } from "react"
import { useApp } from "@/stores/app"
import { Search, ListVideo, Home, Film, Shield, X } from "lucide-react"

export function Header() {
  const { view, setView, setAdmin, isAdmin, browse, setBrowse, setSearch } = useApp()
  const [scrolled, setScrolled] = useState(false)
  const [q, setQ] = useState("")

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    // Check admin status on mount
    fetch("/api/admin/status").then(r => r.json()).then(d => setAdmin(d.admin)).catch(() => {})
  }, [setAdmin])

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(q)
  }

  return (
    <header
      className={`sticky top-0 z-50 transition-colors ${
        scrolled || view !== "home" ? "bg-[#070912]/95 backdrop-blur-xl border-b border-white/5" : "bg-gradient-to-b from-black/80 to-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-[1600px] items-center gap-6 px-4 sm:px-8 py-4">
        <button onClick={() => setView("home")} className="flex items-center gap-2 group shrink-0">
          <Wordmark />
        </button>
        <nav className="hidden lg:flex items-center gap-1 text-sm">
          <NavBtn active={view === "home"} onClick={() => setView("home")}>Home</NavBtn>
          <NavBtn active={view === "browse" && browse.type === "movie"} onClick={() => setBrowse({ type: "movie", sort: "trending" })}>Movies</NavBtn>
          <NavBtn active={view === "browse" && browse.type === "series"} onClick={() => setBrowse({ type: "series", sort: "trending" })}>Series</NavBtn>
          <NavBtn active={view === "live"} onClick={() => setView("live")} className="text-amber-300">Live TV</NavBtn>
          <NavBtn active={view === "browse" && browse.type === "documentary"} onClick={() => setBrowse({ type: "documentary", sort: "trending" })}>Documentaries</NavBtn>
          <NavBtn active={view === "browse" && browse.type === "animation"} onClick={() => setBrowse({ type: "animation", sort: "trending" })}>Animation</NavBtn>
          <NavBtn active={view === "browse" && browse.type === "short"} onClick={() => setBrowse({ type: "short", sort: "recent" })}>Shorts</NavBtn>
          <NavBtn active={view === "mylist"} onClick={() => setView("mylist")}>My List</NavBtn>
          <NavBtn active={view === "admin"} onClick={() => setView("admin")} className={isAdmin ? "text-violet-300" : ""}>
            <Shield className="inline-block h-3.5 w-3.5 mr-1 -mt-0.5" />
            Admin
          </NavBtn>
        </nav>
        <form onSubmit={onSearch} className="relative ml-auto w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search titles, genres, languages"
            className="w-full rounded-full bg-white/5 border border-white/10 pl-9 pr-9 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-cyan-400/40 focus:bg-white/10"
          />
          {q && (
            <button type="button" onClick={() => { setQ(""); setSearch("") }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </form>
      </div>

      {/* Mobile nav */}
      <div className="lg:hidden flex items-center gap-1 px-4 pb-3 overflow-x-auto text-xs">
        <NavBtn active={view === "home"} onClick={() => setView("home")}><Home className="h-3.5 w-3.5" /></NavBtn>
        <NavBtn active={view === "browse" && browse.type === "movie"} onClick={() => setBrowse({ type: "movie", sort: "trending" })}><Film className="h-3.5 w-3.5" /></NavBtn>
        <NavBtn active={view === "mylist"} onClick={() => setView("mylist")}><ListVideo className="h-3.5 w-3.5" /></NavBtn>
        <NavBtn active={view === "admin"} onClick={() => setView("admin")}>Admin</NavBtn>
      </div>
    </header>
  )
}

function NavBtn({ active, onClick, children, className = "" }: { active: boolean; onClick: () => void; children: React.ReactNode; className?: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full font-medium transition-colors whitespace-nowrap ${
        active ? "text-white bg-white/10" : "text-zinc-400 hover:text-zinc-100"
      } ${className}`}
    >
      {children}
    </button>
  )
}

function Wordmark() {
  return (
    <div className="flex items-baseline">
      <span className="text-xl font-extrabold tracking-tight text-white">play</span>
      <span className="mx-0.5 inline-block h-3 w-0.5 rounded-full bg-gradient-to-b from-cyan-400 to-violet-500 self-center" />
      <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-cyan-300 to-violet-300 bg-clip-text text-transparent">beat</span>
      <span className="ml-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500 hidden sm:inline">tv</span>
    </div>
  )
}
