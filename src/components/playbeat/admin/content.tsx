"use client"

import { useEffect, useState } from "react"
import { Loader2, ChevronDown, ChevronUp, Trash2, Edit2, Star } from "lucide-react"
import { LicenseBadge, formatDuration } from "../card"

export function AdminContent() {
  const [items, setItems] = useState<any[]>([])
  const [series, setSeries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "verified" | "review" | "rejected">("all")
  const [tab, setTab] = useState<"content" | "series">("content")
  const [editing, setEditing] = useState<any | null>(null)

  const reload = () => {
    fetch(`/api/admin/content?status=${filter === "all" ? "" : filter}`).then(r => r.json()).then(d => {
      setItems(d.content || [])
      setSeries(d.series || [])
    }).finally(() => setLoading(false))
  }
  useEffect(reload, [filter])

  const remove = async (id: string) => {
    if (!confirm("Delete this title? This cannot be undone.")) return
    await fetch(`/api/admin/content/${id}`, { method: "DELETE" })
    reload()
  }

  const togglePublish = async (item: any) => {
    await fetch(`/api/admin/content/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !item.published }),
    })
    reload()
  }

  const setLicense = async (item: any, status: "verified" | "review" | "rejected") => {
    await fetch(`/api/admin/content/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ licenseStatus: status }),
    })
    reload()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-white">Content Manager</h2>
        <div className="flex items-center gap-1 text-xs">
          {(["all", "verified", "review", "rejected"] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-full px-3 py-1 capitalize ${
                filter === s ? "bg-white/15 text-white" : "bg-white/5 text-zinc-400 hover:bg-white/10"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-white/10 pb-2 text-xs">
        <TabBtn active={tab === "content"} onClick={() => setTab("content")}>Movies / Videos ({items.length})</TabBtn>
        <TabBtn active={tab === "series"} onClick={() => setTab("series")}>Series ({series.length})</TabBtn>
      </div>

      {loading ? (
        <div className="flex justify-center py-12 text-zinc-500"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : tab === "content" ? (
        items.length === 0 ? (
          <Empty />
        ) : (
          <div className="space-y-1">
            {items.map(item => (
              <div key={item.id} className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-3 hover:bg-white/[0.05]">
                <div className="h-14 w-24 shrink-0 overflow-hidden rounded bg-zinc-800">
                  {item.poster && <img src={item.poster} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{item.title}</p>
                  <div className="mt-0.5 flex items-center gap-2 text-[10px] text-zinc-500">
                    <span className="uppercase">{item.type}</span>
                    {item.releaseYear && <span>· {item.releaseYear}</span>}
                    <LicenseBadge status={item.licenseStatus} />
                    {item.sourceProvider && <span className="uppercase">· {item.sourceProvider}</span>}
                    {item.published && <span className="text-emerald-400">· published</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <IconBtn title="Edit" onClick={() => setEditing(item)}><Edit2 className="h-3.5 w-3.5" /></IconBtn>
                  <IconBtn title="Toggle publish" onClick={() => togglePublish(item)}><Star className="h-3.5 w-3.5" /></IconBtn>
                  <IconBtn title="Verify" onClick={() => setLicense(item, "verified")} className="text-emerald-400">✓</IconBtn>
                  <IconBtn title="Reject" onClick={() => setLicense(item, "rejected")} className="text-red-400">✕</IconBtn>
                  <IconBtn title="Delete" onClick={() => remove(item.id)} className="text-red-400"><Trash2 className="h-3.5 w-3.5" /></IconBtn>
                </div>
              </div>
            ))}
          </div>
        )
      ) : series.length === 0 ? (
        <Empty />
      ) : (
        <div className="space-y-1">
          {series.map(s => (
            <div key={s.id} className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-3">
              <div className="h-14 w-24 shrink-0 overflow-hidden rounded bg-zinc-800">
                {s.poster && <img src={s.poster} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{s.title}</p>
                <div className="mt-0.5 text-[10px] text-zinc-500">
                  {s.episodesCount} episodes · {s.sourceProvider}
                  {s.published && <span className="text-emerald-400"> · published</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && <EditDialog item={editing} onClose={() => { setEditing(null); reload() }} />}
    </div>
  )
}

function EditDialog({ item, onClose }: { item: any; onClose: () => void }) {
  const [form, setForm] = useState({
    title: item.title || "",
    description: item.description || "",
    type: item.type || "other",
    releaseYear: item.releaseYear || "",
    licenseStatus: item.licenseStatus || "review",
    licenseType: item.licenseType || "unknown",
    featured: item.featured || false,
    published: item.published || false,
  })
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    await fetch(`/api/admin/content/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        releaseYear: form.releaseYear ? parseInt(String(form.releaseYear)) : null,
      }),
    })
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/15 bg-zinc-950 p-6" onClick={e => e.stopPropagation()}>
        <h3 className="mb-4 text-lg font-bold text-white">Edit content</h3>
        <div className="space-y-3">
          <Input label="Title" value={form.title} onChange={v => setForm({ ...form, title: v })} />
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Description</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={4} className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Type</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white">
                {["movie", "documentary", "short", "animation", "series", "other"].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <Input label="Year" type="number" value={String(form.releaseYear)} onChange={v => setForm({ ...form, releaseYear: v ? parseInt(v) : "" })} />
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">License status</label>
              <select value={form.licenseStatus} onChange={e => setForm({ ...form, licenseStatus: e.target.value })} className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white">
                <option value="verified">Verified</option>
                <option value="review">Review Required</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">License type</label>
              <select value={form.licenseType} onChange={e => setForm({ ...form, licenseType: e.target.value })} className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white">
                {["public_domain", "cc0", "cc_by", "cc_by_sa", "creative_commons", "youtube_official", "playbeat_owned", "unknown"].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input type="checkbox" checked={form.featured} onChange={e => setForm({ ...form, featured: e.target.checked })} />
              Featured
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input type="checkbox" checked={form.published} onChange={e => setForm({ ...form, published: e.target.checked })} />
              Published
            </label>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10">Cancel</button>
          <button onClick={save} disabled={saving} className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-black hover:bg-cyan-400 disabled:opacity-50">
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  )
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`rounded-full px-3 py-1 ${active ? "bg-white/15 text-white" : "bg-white/5 text-zinc-400 hover:bg-white/10"}`}>
      {children}
    </button>
  )
}
function IconBtn({ title, onClick, children, className = "" }: { title: string; onClick: () => void; children: React.ReactNode; className?: string }) {
  return (
    <button title={title} onClick={onClick} className={`flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 hover:bg-white/10 hover:text-white ${className}`}>
      {children}
    </button>
  )
}
function Input({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white" />
    </div>
  )
}
function Empty() {
  return (
    <div className="py-12 text-center text-zinc-500">
      <p>No titles in this view.</p>
      <p className="mt-2 text-xs">Run an import from the Quick Import, Search Import, or Bulk Discovery tabs.</p>
    </div>
  )
}
