"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

interface CreditLog {
  log_id: string
  api_username: string
  info: string
  date: string
  credits_charge: string
  credits_left: string
}

export function AdminIptvLogs() {
  const [logs, setLogs] = useState<CreditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [demo, setDemo] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/admin/iptv/credit-logs").then(r => r.json()).then(d => {
      setLogs(d.logs || [])
      setDemo(d.demo)
      setError(d.error)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-12 text-zinc-500"><Loader2 className="h-6 w-6 animate-spin" /></div>

  return (
    <div className="space-y-4">
      {demo && (
        <div className="rounded-xl border border-amber-400/30 bg-amber-500/[0.04] p-3 text-xs text-amber-200/80">
          Demo mode — showing sample credit logs. Set XTREAM_API_KEY to fetch real ones.
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-400/30 bg-red-500/[0.04] p-3 text-xs text-red-300">
          Error fetching logs: {error}
        </div>
      )}
      {logs.length === 0 ? (
        <div className="py-12 text-center text-zinc-500">
          <p>No credit logs yet.</p>
          <p className="mt-1 text-xs">Logs appear here when credits are consumed via the reseller API.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.03] text-xs uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-left">Info</th>
                <th className="px-4 py-2 text-right">Charge</th>
                <th className="px-4 py-2 text-right">Balance after</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l, i) => {
                const isAdd = l.credits_charge.startsWith("+")
                return (
                  <tr key={l.log_id + i} className="border-t border-white/5 hover:bg-white/[0.02]">
                    <td className="px-4 py-2 text-xs text-zinc-400">{l.date}</td>
                    <td className="px-4 py-2 text-sm text-zinc-200">{l.info}</td>
                    <td className={`px-4 py-2 text-right text-sm font-mono font-semibold ${isAdd ? "text-emerald-400" : "text-amber-400"}`}>
                      {l.credits_charge}
                    </td>
                    <td className="px-4 py-2 text-right text-sm font-mono text-zinc-300">{l.credits_left}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
