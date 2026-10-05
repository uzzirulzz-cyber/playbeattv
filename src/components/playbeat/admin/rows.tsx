"use client"

import { useEffect, useState } from "react"
import { Loader2, Trash2, ArrowUp, ArrowDown } from "lucide-react"

export function AdminRows() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const reload = () => {
    fetch("/api/admin/homepage-rows").then(r => r.json()).then(d => setRows(d.rows || [])).finally(() => setLoading(false))
  }
  useEffect(reload, [])

  const patch = async (id: string, data: any) => {
    await fetch("/api/admin/homepage-rows", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...data }),
    })
    reload()
  }
  const remove = async (id: string) => {
    if (!confirm("Remove this homepage row?")) return
    await fetch(`/api/admin/homepage-rows?id=${id}`, { method: "DELETE" })
    reload()
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-white">Homepage Rows</h2>
      <p className="text-sm text-zinc-400">Reorder, rename, or disable the rails that appear on the homepage.</p>

      {loading ? (
        <div className="flex justify-center py-12 text-zinc-500"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={r.id} className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-3">
              <div className="flex flex-col">
                <button onClick={() => i > 0 && patch(r.id, { order: r.order - 1 })} className="text-zinc-500 hover:text-white"><ArrowUp className="h-3.5 w-3.5" /></button>
                <button onClick={() => i < rows.length - 1 && patch(r.id, { order: r.order + 1 })} className="text-zinc-500 hover:text-white"><ArrowDown className="h-3.5 w-3.5" /></button>
              </div>
              <span className="text-xs text-zinc-500 w-6">#{r.order}</span>
              <input
                value={r.title}
                onChange={e => setRows(rows.map(x => x.id === r.id ? { ...x, title: e.target.value } : x))}
                onBlur={e => patch(r.id, { title: e.target.value })}
                className="flex-1 rounded border border-white/10 bg-white/5 px-2 py-1 text-sm text-white"
              />
              <span className="text-[10px] text-zinc-500 uppercase">{r.filterType}</span>
              <button
                onClick={() => patch(r.id, { enabled: !r.enabled })}
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${r.enabled ? "bg-emerald-500/20 text-emerald-300" : "bg-zinc-700 text-zinc-400"}`}
              >
                {r.enabled ? "on" : "off"}
              </button>
              <button onClick={() => remove(r.id)} className="text-zinc-400 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
