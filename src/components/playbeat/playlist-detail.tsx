"use client"

import { useEffect, useMemo, useState } from "react"
import { useApp } from "@/stores/app"
import { ArrowLeft, Plus, Search, Trash2, Edit2, Download, ExternalLink, Filter, Loader2, Tv, Link2 } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { ChannelModal } from "./channel-modal"

interface Channel {
  id: string
  name: string
  streamUrl: string
  category: string | null
  logoUrl: string | null
  epgUrl: string | null
  tvgId: string | null
  tvgName: string | null
  metadata: string
  sortOrder: number
}

interface Playlist {
  id: string
  name: string
  description: string | null
  epgUrl: string | null
  channels: Channel[]
  createdAt: string
  updatedAt: string
}

export function PlaylistDetailView({ playlistId }: { playlistId: string }) {
  const { closePlaylist } = useApp()
  const [playlist, setPlaylist] = useState<Playlist | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [modal, setModal] = useState<{ mode: "add" } | { mode: "edit"; channel: Channel } | null>(null)

  const reload = () => {
    fetch(`/api/playlists/${playlistId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setPlaylist(d.playlist); else setPlaylist(null) })
      .finally(() => setLoading(false))
  }
  useEffect(() => { reload() }, [playlistId])

  const categories = useMemo(() => {
    if (!playlist) return []
    const counts: Record<string, number> = {}
    for (const c of playlist.channels) {
      const g = c.category || "Uncategorized"
      counts[g] = (counts[g] || 0) + 1
    }
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }, [playlist])

  const filtered = useMemo(() => {
    if (!playlist) return []
    let list = playlist.channels
    if (categoryFilter) {
      list = list.filter(c => (c.category || "Uncategorized") === categoryFilter)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(c => c.name.toLowerCase().includes(q) || c.streamUrl.toLowerCase().includes(q))
    }
    return list
  }, [playlist, search, categoryFilter])

  const removeChannel = async (c: Channel) => {
    if (!confirm(`Delete channel "${c.name}"?`)) return
    await fetch(`/api/playlists/${playlistId}/channels/${c.id}`, { method: "DELETE" })
    reload()
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-[1400px] px-4 sm:px-8 py-8 space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    )
  }

  if (!playlist) {
    return (
      <div className="mx-auto max-w-[1400px] px-4 sm:px-8 py-8">
        <button onClick={closePlaylist} className="mb-4 flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <p className="text-zinc-400">Playlist not found.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-8 py-8">
      {/* Header */}
      <button onClick={closePlaylist} className="mb-4 flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> All playlists
      </button>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-extrabold tracking-tight text-white">{playlist.name}</h1>
          {playlist.description && (
            <p className="mt-1 text-sm text-zinc-400 max-w-2xl">{playlist.description}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-zinc-500">
            <span>{playlist.channels.length} channels</span>
            <span>·</span>
            <span>{categories.length} categories</span>
            {playlist.epgUrl && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Link2 className="h-3 w-3" /> EPG set
                </span>
              </>
            )}
            <span>·</span>
            <span>Updated {new Date(playlist.updatedAt).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={`/api/playlists/${playlist.id}/export`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10"
          >
            <Download className="h-4 w-4" /> Export M3U
          </a>
          <button
            onClick={() => setModal({ mode: "add" })}
            className="flex items-center gap-2 rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-black hover:bg-cyan-400"
          >
            <Plus className="h-4 w-4" /> Add channel
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search channels…"
            className="w-full rounded-lg border border-white/10 bg-white/5 pl-9 pr-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-cyan-400/40 focus:outline-none"
          />
        </div>
        <button
          onClick={() => setCategoryFilter(null)}
          className={`rounded-full px-3 py-1.5 text-xs font-medium ${!categoryFilter ? "bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400/40" : "bg-white/5 text-zinc-400 hover:bg-white/10"}`}
        >
          All ({playlist.channels.length})
        </button>
        {categories.slice(0, 8).map(c => (
          <button
            key={c.name}
            onClick={() => setCategoryFilter(c.name === categoryFilter ? null : c.name)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium truncate max-w-[200px] ${categoryFilter === c.name ? "bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400/40" : "bg-white/5 text-zinc-400 hover:bg-white/10"}`}
            title={c.name}
          >
            {c.name} ({c.count})
          </button>
        ))}
        {categories.length > 8 && (
          <select
            value={categoryFilter || ""}
            onChange={e => setCategoryFilter(e.target.value || null)}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white"
          >
            <option value="">More categories…</option>
            {categories.slice(8).map(c => <option key={c.name} value={c.name}>{c.name} ({c.count})</option>)}
          </select>
        )}
      </div>

      {/* Channel list */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 p-12 text-center">
          <Tv className="mx-auto h-10 w-10 text-zinc-600" />
          <p className="mt-3 text-sm text-zinc-400">
            {playlist.channels.length === 0
              ? "No channels yet. Click \"Add channel\" or use the Import tab to add some."
              : "No channels match your filters."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.02] text-xs uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-4 py-3 text-left font-medium w-12">#</th>
                <th className="px-4 py-3 text-left font-medium">Channel</th>
                <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Category</th>
                <th className="px-4 py-3 text-left font-medium hidden lg:table-cell">Stream URL</th>
                <th className="px-4 py-3 text-right font-medium w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr key={c.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-xs text-zinc-500">{i + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {c.logoUrl ? (
                        <img src={c.logoUrl} alt="" className="h-8 w-8 rounded object-cover bg-white/5" />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded bg-white/5">
                          <Tv className="h-4 w-4 text-zinc-600" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-white truncate">{c.name}</p>
                        {c.tvgId && <p className="text-[10px] text-zinc-600 font-mono truncate">tvg-id: {c.tvgId}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {c.category ? (
                      <span className="rounded bg-white/5 px-2 py-0.5 text-xs text-zinc-300">{c.category}</span>
                    ) : (
                      <span className="text-xs text-zinc-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <code className="text-xs text-zinc-500 truncate block max-w-[300px]" title={c.streamUrl}>
                      {c.streamUrl}
                    </code>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setModal({ mode: "edit", channel: c })}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 hover:bg-white/10 hover:text-white"
                        title="Edit channel"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => removeChannel(c)}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 hover:bg-red-500/10 hover:text-red-400"
                        title="Delete channel"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit modal */}
      {modal && (
        <ChannelModal
          playlistId={playlistId}
          mode={modal.mode}
          channel={"channel" in modal ? modal.channel : undefined}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); reload() }}
        />
      )}
    </div>
  )
}
