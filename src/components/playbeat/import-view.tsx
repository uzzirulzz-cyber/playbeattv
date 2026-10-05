"use client"

import { useState } from "react"
import { useApp } from "@/stores/app"
import { Upload, Link2, Loader2, CheckCircle2, FileText, ArrowLeft, Tv, Save } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface ParsedChannel {
  name: string
  streamUrl: string
  category?: string
  logoUrl?: string
  tvgId?: string
  tvgName?: string
  metadata?: Record<string, string>
}

interface CategorySummary { name: string; count: number }

export function ImportView() {
  const { setView, openPlaylist } = useApp()
  const [mode, setMode] = useState<"text" | "url">("text")
  const [text, setText] = useState("")
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [channels, setChannels] = useState<ParsedChannel[]>([])
  const [categories, setCategories] = useState<CategorySummary[]>([])
  const [source, setSource] = useState<"text" | "url" | null>(null)

  // Save-as-playlist state
  const [showSave, setShowSave] = useState(false)
  const [playlistName, setPlaylistName] = useState("")
  const [playlistDesc, setPlaylistDesc] = useState("")
  const [playlistEpg, setPlaylistEpg] = useState("")
  const [saving, setSaving] = useState(false)
  const [targetPlaylistId, setTargetPlaylistId] = useState<string | "new">("new")
  const [existingPlaylists, setExistingPlaylists] = useState<Array<{ id: string; name: string; channelsCount: number }>>([])

  const parse = async () => {
    setLoading(true); setError(null); setChannels([]); setCategories([])
    try {
      const res = await fetch("/api/import/m3u", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "text" ? { text } : { url }),
      })
      const d = await res.json()
      if (!res.ok) {
        setError(d.error || "Parse failed")
      } else {
        setChannels(d.channels || [])
        setCategories(d.categories || [])
        setSource(d.source)
      }
    } catch (e: any) {
      setError(e.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  const startSave = async () => {
    // Fetch existing playlists so user can choose where to save
    const r = await fetch("/api/playlists")
    const d = await r.json()
    setExistingPlaylists(d.playlists || [])
    setPlaylistName(`Imported ${new Date().toLocaleDateString()}`)
    setShowSave(true)
  }

  const save = async () => {
    if (targetPlaylistId === "new" && !playlistName.trim()) {
      setError("Playlist name required")
      return
    }
    setSaving(true); setError(null)
    try {
      let playlistId = targetPlaylistId
      if (targetPlaylistId === "new") {
        const createRes = await fetch("/api/playlists", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: playlistName, description: playlistDesc, epgUrl: playlistEpg }),
        })
        const createD = await createRes.json()
        if (!createRes.ok) throw new Error(createD.error || "Failed to create playlist")
        playlistId = createD.playlist.id
      }

      const importRes = await fetch(`/api/playlists/${playlistId}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channels, dedupe: true }),
      })
      const importD = await importRes.json()
      if (!importRes.ok) throw new Error(importD.error || "Failed to import")

      setShowSave(false)
      openPlaylist(playlistId)
    } catch (e: any) {
      setError(e.message || String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-[1100px] px-4 sm:px-8 py-8">
      <button onClick={() => setView("playlists")} className="mb-4 flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> All playlists
      </button>

      <div className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Import M3U</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Paste an M3U/M3U8 playlist as text, or fetch from a URL. Preview the parsed channels before saving to a playlist.
        </p>
      </div>

      {/* Mode switcher */}
      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={() => setMode("text")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${mode === "text" ? "bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400/40" : "bg-white/5 text-zinc-400 hover:bg-white/10"}`}
        >
          <FileText className="h-4 w-4" /> Paste text
        </button>
        <button
          onClick={() => setMode("url")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${mode === "url" ? "bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400/40" : "bg-white/5 text-zinc-400 hover:bg-white/10"}`}
        >
          <Link2 className="h-4 w-4" /> From URL
        </button>
      </div>

      {/* Input */}
      {mode === "text" ? (
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={10}
          placeholder="#EXTM3U&#10;#EXTINF:-1 tvg-id=&quot;cnn&quot; tvg-logo=&quot;https://...&quot; group-title=&quot;News&quot;,CNN International&#10;https://cdn.example.com/cnn.m3u8&#10;#EXTINF:-1 ...,BBC News&#10;https://cdn.example.com/bbc.m3u8"
          className="w-full rounded-xl border border-white/10 bg-white/5 p-4 font-mono text-xs text-white placeholder-zinc-600 focus:border-cyan-400/40 focus:outline-none"
        />
      ) : (
        <div className="relative">
          <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://example.com/playlist.m3u8"
            className="w-full rounded-xl border border-white/10 bg-white/5 pl-9 pr-3 py-3 text-sm text-white placeholder-zinc-500 focus:border-cyan-400/40 focus:outline-none font-mono"
          />
        </div>
      )}

      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={parse}
          disabled={loading || (mode === "text" ? !text.trim() : !url.trim())}
          className="flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-black hover:bg-cyan-400 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {loading ? "Parsing…" : "Parse & preview"}
        </button>
        {channels.length > 0 && (
          <button
            onClick={startSave}
            className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-400"
          >
            <Save className="h-4 w-4" /> Save to playlist ({channels.length})
          </button>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Preview */}
      {channels.length > 0 && (
        <div className="mt-8 space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold text-white">Preview</h2>
            <span className="text-xs text-zinc-500">
              {channels.length} channels parsed from {source === "url" ? "URL" : "pasted text"}
            </span>
          </div>

          {categories.length > 0 && (
            <div className="flex flex-wrap gap-1.5 text-xs">
              {categories.slice(0, 12).map(c => (
                <span key={c.name} className="rounded-full bg-white/5 px-2.5 py-1 text-zinc-400">
                  {c.name} ({c.count})
                </span>
              ))}
              {categories.length > 12 && (
                <span className="rounded-full bg-white/5 px-2.5 py-1 text-zinc-500">+ {categories.length - 12} more</span>
              )}
            </div>
          )}

          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.02] text-xs uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="px-4 py-3 text-left font-medium w-12">#</th>
                  <th className="px-4 py-3 text-left font-medium">Channel</th>
                  <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Category</th>
                  <th className="px-4 py-3 text-left font-medium hidden lg:table-cell">Stream URL</th>
                </tr>
              </thead>
              <tbody>
                {channels.slice(0, 50).map((c, i) => (
                  <tr key={i} className="border-t border-white/5">
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
                      ) : <span className="text-xs text-zinc-600">—</span>}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <code className="text-xs text-zinc-500 truncate block max-w-[300px]" title={c.streamUrl}>
                        {c.streamUrl}
                      </code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {channels.length > 50 && (
            <p className="text-xs text-zinc-500 text-center">
              Showing first 50 of {channels.length} channels. All will be imported when you save.
            </p>
          )}
        </div>
      )}

      {/* Save-as-playlist modal */}
      {showSave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setShowSave(false)}>
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[#0d1018] p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-4">Save {channels.length} channels to playlist</h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Target playlist</label>
                <select
                  value={targetPlaylistId}
                  onChange={e => setTargetPlaylistId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                >
                  <option value="new">+ Create new playlist</option>
                  {existingPlaylists.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.channelsCount} channels)</option>
                  ))}
                </select>
              </div>

              {targetPlaylistId === "new" && (
                <>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Name *</label>
                    <input value={playlistName} onChange={e => setPlaylistName(e.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Description (optional)</label>
                    <input value={playlistDesc} onChange={e => setPlaylistDesc(e.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">EPG URL (optional)</label>
                    <input value={playlistEpg} onChange={e => setPlaylistEpg(e.target.value)} placeholder="https://epg.example.com/epg.xml" className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white font-mono" />
                  </div>
                </>
              )}

              {targetPlaylistId !== "new" && (
                <div className="rounded-lg border border-cyan-400/20 bg-cyan-500/[0.04] p-3 text-xs text-cyan-200/80">
                  Channels with duplicate stream URLs will be skipped to avoid duplicates in the target playlist.
                </div>
              )}
            </div>

            {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowSave(false)} className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-400 hover:bg-white/10">Cancel</button>
              <button
                onClick={save}
                disabled={saving || (targetPlaylistId === "new" && !playlistName.trim())}
                className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Import channels"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
