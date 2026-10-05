"use client"

import { useEffect, useState } from "react"
import { Loader2, Tv, Zap, AlertCircle, Server, CheckCircle2 } from "lucide-react"

export function AdminIptvOverview() {
  const [status, setStatus] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/iptv/status").then(r => r.json()),
      fetch("/api/admin/iptv/lines?status=all").then(r => r.json()),
    ]).then(([s, l]) => {
      setStatus(s)
      setStats({ lineCount: l.lines?.length || 0, activeLines: l.lines?.filter((x: any) => x.status === "active").length || 0 })
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-12 text-zinc-500"><Loader2 className="h-6 w-6 animate-spin" /></div>

  const info = status?.info
  const demo = status?.demo

  return (
    <div className="space-y-6">
      {/* Config banner */}
      <div className={`rounded-xl border p-4 ${status?.configured ? "border-emerald-400/30 bg-emerald-500/[0.04]" : "border-amber-400/30 bg-amber-500/[0.04]"}`}>
        <div className="flex items-start gap-3">
          {status?.configured
            ? <CheckCircle2 className="h-5 w-5 text-emerald-400 mt-0.5" />
            : <AlertCircle className="h-5 w-5 text-amber-400 mt-0.5" />}
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-white">
              {status?.configured ? "Xtream API connected" : "Demo mode — Xtream API not configured"}
            </h3>
            <p className="mt-1 text-xs text-zinc-400">
              {status?.configured
                ? "All write actions (create / extend / delete) call the live Xtream Masters reseller API. The API key is stored in env."
                : "All write actions are simulated locally. The UI is fully functional but no real changes are made. Set XTREAM_API_KEY in env to go live."}
            </p>
            {status?.serverUrl && (
              <p className="mt-2 flex items-center gap-1 text-xs text-zinc-500">
                <Server className="h-3 w-3" /> {status.serverUrl}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Account info cards */}
      {info && (
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-3">Account</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <Card label="Credit Balance" value={info.user_credit} highlight />
            <Card label="Total Paid Lines" value={info.total_paid_lines} />
            <Card label="Monthly Plan" value={info.is_monthly === "1" ? "Yes" : "No"} />
            <Card label="Max Lines" value={info.monthly_max_lines || "—"} />
            <Card label="Next Renewal" value={info.next_renewal === "0" ? "—" : info.next_renewal} />
          </div>
        </div>
      )}

      {/* Trial usage */}
      {info && (
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-3">Trial usage</h3>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-2xl font-bold text-white">{info.used_trial}</span>
                <span className="text-zinc-500"> / {info.allow_trial} trials used</span>
              </div>
              <span className="text-xs text-zinc-500">
                {parseInt(info.allow_trial) - parseInt(info.used_trial)} remaining
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded bg-zinc-800">
              <div className="h-full bg-gradient-to-r from-amber-400 to-amber-500"
                style={{ width: `${(parseInt(info.used_trial) / Math.max(parseInt(info.allow_trial), 1)) * 100}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* Local line stats */}
      {stats && (
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-3">Local database</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card label="Lines stored" value={stats.lineCount} />
            <Card label="Active lines" value={stats.activeLines} highlight={stats.activeLines > 0} />
            <Card label="WhatsApp bot" value={info?.whatsapp_bot || "—"} small />
            <Card label="API status" value={info?.api_status === "1" ? "Active" : "Inactive"} />
          </div>
        </div>
      )}

      {/* Quick info about what IPTV is */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
        <h3 className="text-sm font-semibold text-white">About Premium IPTV</h3>
        <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
          Premium IPTV is a separate product tier from PlayBeat TV&apos;s free legal library. Subscribers get access to live TV channels, VOD movies, and series via the Xtream protocol. Three line types are supported:
        </p>
        <ul className="mt-3 space-y-1.5 text-xs text-zinc-400">
          <li><strong className="text-zinc-200">Xtream lines</strong> — username + password; works on any M3U / Xtream player</li>
          <li><strong className="text-zinc-200">ActiveCodes</strong> — numeric codes for specific APKs / ISO players; activation callback supported</li>
          <li><strong className="text-zinc-200">Mac addresses</strong> — for set-top boxes with a custom portal URL</li>
        </ul>
        <p className="mt-3 text-xs text-zinc-500">
          Every paid action consumes reseller credits. Deletions within 2 days refund credits (or use force-delete).
        </p>
      </div>
    </div>
  )
}

function Card({ label, value, highlight, small }: { label: string; value: string | number; highlight?: boolean; small?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${highlight ? "border-amber-400/30 bg-amber-500/[0.05]" : "border-white/10 bg-white/[0.03]"}`}>
      <div className={`${small ? "text-base" : "text-2xl"} font-bold ${highlight ? "text-amber-200" : "text-white"}`}>{value}</div>
      <div className="text-xs text-zinc-400 mt-0.5">{label}</div>
    </div>
  )
}
