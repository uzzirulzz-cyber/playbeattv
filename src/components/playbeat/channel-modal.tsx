"use client"

import { useState } from "react"
import { X, Loader2 } from "lucide-react"
import { isValidStreamUrl } from "@/lib/m3u"

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
}

interface Props {
  playlistId: string
  mode: "add" | "edit"
  channel?: Channel
  onClose: () => void
  onSaved: () => void
}

export function ChannelModal({ playlistId, mode, channel, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    name: channel?.name || "",
    streamUrl: channel?.streamUrl || "",
    category: channel?.category || "",
    logoUrl: channel?.logoUrl || "",
    epgUrl: channel?.epgUrl || "",
    tvgId: channel?.tvgId || "",
    tvgName: channel?.tvgName || "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return setError("Channel name is required")
    if (!form.streamUrl.trim()) return setError("Stream URL is required")
    if (!isValidStreamUrl(form.streamUrl.trim())) {
      return setError("Stream URL must start with http(s)://, rtmp://, or rtsp://")
    }
    setError(null)
    setLoading(true)

    const body = {
      name: form.name.trim(),
      streamUrl: form.streamUrl.trim(),
      category: form.category.trim() || null,
      logoUrl: form.logoUrl.trim() || null,
      epgUrl: form.epgUrl.trim() || null,
      tvgId: form.tvgId.trim() || null,
      tvgName: form.tvgName.trim() || null,
    }

    const url = mode === "add"
      ? `/api/playlists/${playlistId}/channels`
      : `/api/playlists/${playlistId}/channels/${channel!.id}`
    const method = mode === "add" ? "POST" : "PATCH"

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    setLoading(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error || `Failed (${res.status})`)
      return
    }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/15 bg-[#0d1018] p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">
            {mode === "add" ? "Add channel" : "Edit channel"}
          </h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <Field label="Channel name *">
            <input value={form.name} onChange={set("name")} placeholder="CNN International" className={inputCls} />
          </Field>
          <Field label="Stream URL *" hint="HLS (.m3u8), MP4, RTMP, or RTSP">
            <input value={form.streamUrl} onChange={set("streamUrl")} placeholder="https://cdn.example.com/cnn.m3u8" className={`${inputCls} font-mono text-xs`} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <input value={form.category} onChange={set("category")} placeholder="News" className={inputCls} />
            </Field>
            <Field label="Logo URL">
              <input value={form.logoUrl} onChange={set("logoUrl")} placeholder="https://…/logo.png" className={`${inputCls} font-mono text-xs`} />
            </Field>
          </div>
          <Field label="EPG URL (per-channel, optional)">
            <input value={form.epgUrl} onChange={set("epgUrl")} placeholder="https://epg.example.com/cnn.xml" className={`${inputCls} font-mono text-xs`} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="tvg-id" hint="For EPG matching">
              <input value={form.tvgId} onChange={set("tvgId")} placeholder="cnn.com" className={`${inputCls} font-mono text-xs`} />
            </Field>
            <Field label="tvg-name">
              <input value={form.tvgName} onChange={set("tvgName")} placeholder="CNN International" className={`${inputCls} font-mono text-xs`} />
            </Field>
          </div>

          {error && (
            <div className="rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-xs text-red-300">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-400 hover:bg-white/10">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-black hover:bg-cyan-400 disabled:opacity-50"
            >
              {loading ? "Saving…" : mode === "add" ? "Add channel" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const inputCls = "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-cyan-400/40 focus:outline-none"

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{label}</label>
      {hint && <p className="text-[10px] text-zinc-600 mb-1">{hint}</p>}
      <div className={hint ? "" : "mt-1"}>{children}</div>
    </div>
  )
}
