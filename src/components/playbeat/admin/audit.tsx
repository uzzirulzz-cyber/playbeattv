"use client"

import { useEffect, useState } from "react"
import { Loader2, Play } from "lucide-react"

export function AdminAudit() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>("")

  useEffect(() => {
    const qs = filter ? `?action=${filter}` : ""
    fetch(`/api/admin/audit${qs}`).then(r => r.json()).then(d => setLogs(d.logs || [])).finally(() => setLoading(false))
  }, [filter])

  if (loading) return <div className="flex justify-center py-12 text-zinc-500"><Loader2 className="h-6 w-6 animate-spin" /></div>

  const actions = ["", "content.imported", "content.published", "content.rejected", "content.edited", "content.deleted", "license.override", "source.changed", "import.run", "import.completed", "settings.changed"]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Audit Log</h2>
        <select value={filter} onChange={e => setFilter(e.target.value)} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white">
          {actions.map(a => <option key={a} value={a}>{a || "all actions"}</option>)}
        </select>
      </div>

      {logs.length === 0 ? (
        <div className="py-12 text-center text-zinc-500">No audit entries.</div>
      ) : (
        <div className="space-y-1 max-h-[70vh] overflow-y-auto">
          {logs.map(l => (
            <div key={l.id} className="flex items-start gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-3">
              <div className="shrink-0">
                <span className="rounded px-2 py-0.5 text-[10px] font-semibold uppercase bg-violet-500/20 text-violet-300">
                  {l.action}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white">
                  <span className="text-zinc-400">actor:</span> {l.actor}
                  {l.target && <span className="ml-2 text-zinc-400">→ {l.targetType}: <code className="text-cyan-300">{l.target.slice(0, 12)}</code></span>}
                </p>
                <p className="text-[10px] text-zinc-500 mt-0.5">
                  {new Date(l.timestamp).toLocaleString()}
                  {l.ip && ` · ${l.ip}`}
                </p>
                {Object.keys(l.detail || {}).length > 0 && (
                  <pre className="mt-1 max-h-32 overflow-auto rounded bg-black/30 p-2 text-[10px] text-zinc-400">
                    {JSON.stringify(l.detail, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
