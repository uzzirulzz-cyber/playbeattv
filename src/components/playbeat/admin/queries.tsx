"use client"

import { useEffect, useState } from "react"
import { Loader2, Plus, Trash2 } from "lucide-react"

export function AdminQueries() {
  const [queries, setQueries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newQuery, setNewQuery] = useState("")
  const [newSource, setNewSource] = useState<"youtube" | "wikimedia">("youtube")

  const reload = () => {
    fetch("/api/admin/import/source-queries").then(r => r.json()).then(d => setQueries(d.queries || [])).finally(() => setLoading(false))
  }
  useEffect(reload, [])

  const add = async () => {
    if (!newQuery.trim()) return
    await fetch("/api/admin/import/source-queries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: newQuery, source: newSource }),
    })
    setNewQuery(""); setAdding(false)
    reload()
  }

  const toggle = async (q: any) => {
    await fetch("/api/admin/import/source-queries", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: q.id, enabled: !q.enabled }),
    })
    reload()
  }

  const remove = async (id: string) => {
    if (!confirm("Delete this query?")) return
    await fetch(`/api/admin/import/source-queries?id=${id}`, { method: "DELETE" })
    reload()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Source Query Library</h2>
        <button onClick={() => setAdding(true)} className="flex items-center gap-1 rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-black hover:bg-cyan-400">
          <Plus className="h-3.5 w-3.5" /> Add Query
        </button>
      </div>
      <p className="text-sm text-zinc-400">
        These queries are used by Bulk Discovery and Auto-Import. Edit freely.
      </p>

      {adding && (
        <div className="rounded-xl border border-cyan-400/30 bg-cyan-500/[0.05] p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <select value={newSource} onChange={e => setNewSource(e.target.value as any)} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white">
              <option value="youtube">YouTube</option>
              <option value="wikimedia">Wikimedia Commons</option>
            </select>
            <input
              autoFocus
              value={newQuery}
              onChange={e => setNewQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && add()}
              placeholder="public domain comedy films"
              className="sm:col-span-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-zinc-500"
            />
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <button onClick={() => setAdding(false)} className="rounded border border-white/10 px-3 py-1 text-xs text-zinc-400 hover:bg-white/5">Cancel</button>
            <button onClick={add} className="rounded bg-cyan-500 px-3 py-1 text-xs font-semibold text-black hover:bg-cyan-400">Add</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12 text-zinc-500"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : queries.length === 0 ? (
        <div className="py-12 text-center text-zinc-500">No queries yet.</div>
      ) : (
        <div className="space-y-1">
          {queries.map(q => (
            <div key={q.id} className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-3">
              <span className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${q.source === "youtube" ? "bg-red-500/20 text-red-300" : "bg-blue-500/20 text-blue-300"}`}>
                {q.source}
              </span>
              <span className="flex-1 text-sm text-white">{q.query}</span>
              <span className="text-[10px] text-zinc-500">{q.useCount} uses</span>
              <button
                onClick={() => toggle(q)}
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${q.enabled ? "bg-emerald-500/20 text-emerald-300" : "bg-zinc-700 text-zinc-400"}`}
              >
                {q.enabled ? "on" : "off"}
              </button>
              <button onClick={() => remove(q.id)} className="text-zinc-400 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
