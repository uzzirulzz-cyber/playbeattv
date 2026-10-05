"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

export function AdminJobs() {
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/admin/import/jobs?limit=50").then(r => r.json()).then(d => setJobs(d.jobs || [])).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-12 text-zinc-500"><Loader2 className="h-6 w-6 animate-spin" /></div>
  if (jobs.length === 0) return <div className="py-12 text-center text-zinc-500">No import jobs yet.</div>

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-white">Import Jobs</h2>
      {jobs.map(j => (
        <div key={j.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StatusPill status={j.status} />
              <span className="text-sm font-semibold capitalize text-white">{j.source}</span>
              <span className="text-xs text-zinc-500">{new Date(j.startedAt).toLocaleString()}</span>
            </div>
            <span className="text-xs text-zinc-500">{j.requestedBy}</span>
          </div>
          <div className="mt-3 grid grid-cols-4 sm:grid-cols-7 gap-2 text-center">
            <Mini label="Discovered" value={j.discovered} />
            <Mini label="Imported" value={j.imported} />
            <Mini label="Published" value={j.published} />
            <Mini label="Duplicates" value={j.duplicates} />
            <Mini label="Rejected" value={j.rejected} />
            <Mini label="Review" value={j.reviewRequired} />
            <Mini label="Errors" value={j.errors} />
          </div>
          {j.log?.length > 0 && (
            <details className="mt-3">
              <summary className="cursor-pointer text-xs text-zinc-400 hover:text-zinc-200">Log</summary>
              <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-black/40 p-3 text-[10px] text-zinc-300">{j.log.join("\n")}</pre>
            </details>
          )}
        </div>
      ))}
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    completed: "bg-emerald-500/20 text-emerald-300",
    failed:    "bg-red-500/20 text-red-300",
    partial:   "bg-amber-500/20 text-amber-300",
    running:   "bg-cyan-500/20 text-cyan-300",
  }
  return <span className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${map[status] || "bg-zinc-700 text-zinc-300"}`}>{status}</span>
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-lg font-bold text-white">{value}</div>
      <div className="text-[10px] text-zinc-500">{label}</div>
    </div>
  )
}
