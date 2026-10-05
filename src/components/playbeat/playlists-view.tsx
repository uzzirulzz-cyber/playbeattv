"use client"

import { useEffect, useState } from "react"
import { useApp } from "@/stores/app"
import { Plus, ListMusic, Loader2, Trash2, Download, ExternalLink, Calendar, Tv } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface Playlist {
  id: string
  name: string
  description: string | null
  epgUrl: string | null
  channelsCount: number
  createdAt: string
  updatedAt: string
}

export function PlaylistsView() {
  const { openPlaylist, setView } = useApp()
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  const reload = () => {
    fetch("/api/playlists").then(r => r.json()).then(d => setPlaylists(d.playlists || [])).finally(() => setLoading(false))
  }
  useEffect(reload, [])

  const remove = async (p: Playlist) => {
    if (!confirm(`Delete playlist "${p.name}" and all its ${p.channelsCount} channels? This cannot be undone.`)) return
    await fetch(`/api/playlists/${p.id}`, { method: "DELETE" })
    reload()
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-8 py-8">
      {/* Hero / heading */}
      <div className="mb-8">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Playlists</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Create, organize, and export IPTV playlists as M3U / M3U8 files.
            </p>
          </div>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-black hover:bg-cyan-400"
          >
            <Plus className="h-4 w-4" /> New Playlist
          </button>
        </div>
      </div>

      {showCreate && <CreatePlaylistForm onCreated={(id) => { setShowCreate(false); openPlaylist(id) }} onCancel={() => setShowCreate(false)} />}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0,1,2,3,4,5].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
        </div>
      ) : playlists.length === 0 ? (
        <EmptyState onCreate={() => setShowCreate(true)} onImport={() => setView("import")} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {playlists.map(p => (
            <PlaylistCard key={p.id} playlist={p} onOpen={() => openPlaylist(p.id)} onDelete={() => remove(p)} />
          ))}
        </div>
      )}
    </div>
  )
}

function PlaylistCard({ playlist, onOpen, onDelete }: { playlist: Playlist; onOpen: () => void; onDelete: () => void }) {
  return (
    <div
      onClick={onOpen}
      className="group relative cursor-pointer overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] p-5 hover:border-cyan-400/40 hover:bg-white/[0.04] transition-all"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500/20 to-violet-500/20 ring-1 ring-white/10">
          <ListMusic className="h-5 w-5 text-cyan-300" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white truncate">{playlist.name}</h3>
          <p className="text-xs text-zinc-500 mt-0.5">{playlist.channelsCount} channels</p>
        </div>
      </div>
      {playlist.description && (
        <p className="mt-3 text-xs text-zinc-400 line-clamp-2 leading-relaxed">{playlist.description}</p>
      )}
      <div className="mt-4 flex items-center justify-between">
        <span className="text-[10px] text-zinc-600">
          Updated {new Date(playlist.updatedAt).toLocaleDateString()}
        </span>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <a
            href={`/api/playlists/${playlist.id}/export`}
            target="_blank"
            rel="noreferrer"
            className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 hover:bg-white/10 hover:text-cyan-300"
            title="Download M3U"
          >
            <Download className="h-3.5 w-3.5" />
          </a>
          <button
            onClick={onDelete}
            className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 hover:bg-red-500/10 hover:text-red-400"
            title="Delete playlist"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

function CreatePlaylistForm({ onCreated, onCancel }: { onCreated: (id: string) => void; onCancel: () => void }) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [epgUrl, setEpgUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true); setError(null)
    const res = await fetch("/api/playlists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, epgUrl }),
    })
    const d = await res.json()
    setLoading(false)
    if (!res.ok) { setError(d.error || "Failed"); return }
    onCreated(d.playlist.id)
  }

  return (
    <form onSubmit={submit} className="mb-6 rounded-xl border border-cyan-400/20 bg-cyan-500/[0.03] p-5 space-y-3">
      <h3 className="text-sm font-semibold text-white">Create new playlist</h3>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Name *</label>
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="My Live TV Playlist"
          className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-zinc-500"
        />
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Description (optional)</label>
        <input
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Family entertainment — news, sports, movies"
          className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-zinc-500"
        />
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">EPG URL (optional, XMLTV)</label>
        <input
          value={epgUrl}
          onChange={e => setEpgUrl(e.target.value)}
          placeholder="https://epg.example.com/epg.xml"
          className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-zinc-500 font-mono"
        />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-400 hover:bg-white/10">Cancel</button>
        <button type="submit" disabled={loading || !name.trim()} className="rounded-lg bg-cyan-500 px-4 py-1.5 text-xs font-semibold text-black hover:bg-cyan-400 disabled:opacity-50">
          {loading ? "Creating…" : "Create"}
        </button>
      </div>
    </form>
  )
}

function EmptyState({ onCreate, onImport }: { onCreate: () => void; onImport: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-white/10 p-12 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white/5">
        <Tv className="h-6 w-6 text-zinc-500" />
      </div>
      <h3 className="text-base font-semibold text-white">No playlists yet</h3>
      <p className="mt-1 text-sm text-zinc-500 max-w-md mx-auto">
        Create a new playlist from scratch, or import an existing M3U / M3U8 file to get started.
      </p>
      <div className="mt-4 flex items-center justify-center gap-2">
        <button onClick={onCreate} className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-black hover:bg-cyan-400">
          <Plus className="inline-block h-4 w-4 mr-1" /> Create playlist
        </button>
        <button onClick={onImport} className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10">
          <ExternalLink className="inline-block h-4 w-4 mr-1" /> Import M3U
        </button>
      </div>
    </div>
  )
}
