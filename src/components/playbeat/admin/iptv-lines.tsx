"use client"

import { useEffect, useState } from "react"
import { Loader2, Plus, Trash2, RefreshCw, Copy, Eye, EyeOff, ExternalLink } from "lucide-react"
import { PLANS, BOUQUETS } from "@/lib/xtream/client"

interface Line {
  id: string
  username: string
  serverUrl: string | null
  conx: number
  plan: number
  planLabel: string
  bid: string
  bouquetLabel: string
  addChannels: boolean
  addVods: boolean
  adults: boolean
  notice: string | null
  status: string
  startsAt: string
  expiresAt: string | null
}

export function AdminIptvLines() {
  const [lines, setLines] = useState<Line[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [filter, setFilter] = useState("all")
  const [revealed, setRevealed] = useState<Set<string>>(new Set())
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const reload = () => {
    fetch(`/api/admin/iptv/lines?status=${filter}`).then(r => r.json()).then(d => setLines(d.lines || [])).finally(() => setLoading(false))
  }
  useEffect(reload, [filter])

  const create = async (form: any) => {
    setActionLoading("create")
    const res = await fetch("/api/admin/iptv/lines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", ...form }),
    })
    const d = await res.json()
    setActionLoading(null)
    if (!res.ok) {
      alert(d.error || "Failed to create line")
      return
    }
    setShowAdd(false)
    reload()
    alert(d.demo ? `Demo: ${d.msg}` : `Created line "${form.username}"`)
  }

  const extend = async (line: Line) => {
    const plan = prompt(`Extend "${line.username}" by which plan?\n1=1mo, 2=3mo, 3=6mo, 4=12mo`, "1")
    if (!plan) return
    setActionLoading(`extend-${line.id}`)
    const res = await fetch("/api/admin/iptv/lines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "extend", id: line.id, plan: parseInt(plan) }),
    })
    const d = await res.json()
    setActionLoading(null)
    if (!res.ok) { alert(d.error); return }
    reload()
    alert(d.demo ? `Demo: ${d.msg}` : `Extended "${line.username}"`)
  }

  const remove = async (line: Line) => {
    if (!confirm(`Delete line "${line.username}"?\n\nUse force delete to refund credits if older than 2 days?`)) return
    const force = confirm("Click OK to force-delete (refunds credits). Cancel for soft delete (no refund).")
    setActionLoading(`del-${line.id}`)
    const res = await fetch("/api/admin/iptv/lines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id: line.id, force }),
    })
    const d = await res.json()
    setActionLoading(null)
    if (!res.ok) { alert(d.error); return }
    reload()
    alert(d.demo ? `Demo: ${d.msg}` : `Deleted "${line.username}"`)
  }

  const toggleReveal = (id: string) => {
    const next = new Set(revealed)
    if (next.has(id)) next.delete(id); else next.add(id)
    setRevealed(next)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 text-xs">
          {["all", "active", "expired", "deleted"].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-full px-3 py-1 capitalize ${filter === s ? "bg-white/15 text-white" : "bg-white/5 text-zinc-400 hover:bg-white/10"}`}
            >
              {s}
            </button>
          ))}
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-black hover:bg-amber-400">
          <Plus className="h-3.5 w-3.5" /> New Line
        </button>
      </div>

      {showAdd && <CreateLineForm onSubmit={create} onCancel={() => setShowAdd(false)} loading={actionLoading === "create"} />}

      {loading ? (
        <div className="flex justify-center py-12 text-zinc-500"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : lines.length === 0 ? (
        <div className="py-12 text-center text-zinc-500">
          <p>No lines yet.</p>
          <p className="mt-1 text-xs">Create one above — every paid action consumes reseller credits.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {lines.map(line => (
            <div key={line.id} className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">{line.username}</span>
                    <button onClick={() => toggleReveal(line.id)} className="text-zinc-500 hover:text-zinc-300">
                      {revealed.has(line.id) ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </button>
                    <StatusPill status={line.status} />
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-zinc-500">
                    <span className="rounded bg-white/5 px-1.5 py-0.5">{line.planLabel}</span>
                    <span className="rounded bg-white/5 px-1.5 py-0.5">{line.bouquetLabel}</span>
                    <span className="rounded bg-white/5 px-1.5 py-0.5">CONX {line.conx}</span>
                    {line.adults && <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-red-300">Adult</span>}
                    {line.serverUrl && <span className="rounded bg-cyan-500/10 px-1.5 py-0.5 text-cyan-300 truncate max-w-[180px]" title={line.serverUrl}>{line.serverUrl}</span>}
                    <span>Created {new Date(line.startsAt).toLocaleDateString()}</span>
                    {line.expiresAt && <span>· expires {new Date(line.expiresAt).toLocaleDateString()}</span>}
                  </div>
                  {revealed.has(line.id) && (
                    <div className="mt-2 rounded bg-black/40 p-2 text-[10px] text-zinc-400 font-mono space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-500">M3U:</span>
                        <code className="flex-1 truncate">/api/admin/iptv/m3u/{line.id}</code>
                        <button
                          onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/api/admin/iptv/m3u/${line.id}`)}
                          className="text-cyan-300 hover:text-cyan-200"
                          title="Copy M3U URL"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-500">Web:</span>
                        <code className="flex-1 truncate text-amber-300">/api/iptv/webplayer/{line.id}</code>
                        <a
                          href={`/api/iptv/webplayer/${line.id}`}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="text-amber-300 hover:text-amber-200"
                          title="Open in Xtream Masters web player (auto-fills credentials)"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => extend(line)}
                    disabled={actionLoading === `extend-${line.id}`}
                    className="flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-white hover:bg-white/10 disabled:opacity-50"
                  >
                    {actionLoading === `extend-${line.id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                    Extend
                  </button>
                  <button
                    onClick={() => remove(line)}
                    disabled={actionLoading === `del-${line.id}`}
                    className="flex items-center gap-1 rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs text-red-300 hover:bg-red-500/20 disabled:opacity-50"
                  >
                    {actionLoading === `del-${line.id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-emerald-500/20 text-emerald-300",
    expired: "bg-zinc-700 text-zinc-300",
    deleted: "bg-red-500/20 text-red-300",
    suspended: "bg-amber-500/20 text-amber-300",
  }
  return <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${map[status] || "bg-zinc-700 text-zinc-300"}`}>{status}</span>
}

function CreateLineForm({ onSubmit, onCancel, loading }: { onSubmit: (form: any) => void; onCancel: () => void; loading: boolean }) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [serverUrl, setServerUrl] = useState("")
  const [conx, setConx] = useState(1)
  const [plan, setPlan] = useState(11)
  const [bid, setBid] = useState("[5,11]")
  const [addChannels, setAddChannels] = useState(true)
  const [addVods, setAddVods] = useState(true)
  const [adults, setAdults] = useState(false)
  const [notice, setNotice] = useState("")

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !password) return
    if (username.length < 6 || username.length > 23) { alert("Username must be 6-23 characters"); return }
    if (!/^[a-z0-9._-]+$/i.test(username)) { alert("Username allows only a-z, 0-9, ., _, -"); return }
    if (!/^[a-z0-9._-]+$/i.test(password)) { alert("Password allows only a-z, 0-9, ., _, -"); return }
    onSubmit({ username, password, serverUrl: serverUrl || undefined, conx, plan, bid, addChannels, addVods, adults, notice })
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-amber-400/30 bg-amber-500/[0.03] p-4 space-y-3">
      <h4 className="text-sm font-semibold text-white">Create / register Xtream line</h4>
      <p className="text-xs text-zinc-500">
        If you provide a <strong>Server URL</strong>, this is treated as a customer-side line on a 3rd-party panel (no reseller API call needed — credentials stored locally so we can proxy M3U requests).
        Leave Server URL empty to provision a line via the reseller API (consumes credits).
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Username (6-23 chars)">
          <input value={username} onChange={e => setUsername(e.target.value)} className="w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white" placeholder="john_doe" />
        </Field>
        <Field label="Password (6-23 chars)">
          <input value={password} onChange={e => setPassword(e.target.value)} className="w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white" placeholder="******" />
        </Field>
        <Field label="Server URL (optional — for 3rd-party panel lines)">
          <input value={serverUrl} onChange={e => setServerUrl(e.target.value)} className="w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white font-mono" placeholder="http://panel.example.com:8080" />
        </Field>
        <Field label="Plan">
          <select value={plan} onChange={e => setPlan(parseInt(e.target.value))} className="w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white">
            {PLANS.map(p => <option key={p.id} value={p.id}>{p.name}{p.isTrial ? " (Free)" : ` (${p.creditsWorld} credits)`}</option>)}
          </select>
        </Field>
        <Field label="Bouquet">
          <select value={bid} onChange={e => setBid(e.target.value)} className="w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white">
            {BOUQUETS.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </Field>
        <Field label="Multi-screen (CONX)">
          <select value={conx} onChange={e => setConx(parseInt(e.target.value))} className="w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white">
            {[1, 2, 3, 4].map(c => <option key={c} value={c}>{c} × screens</option>)}
          </select>
        </Field>
        <Field label="Notice">
          <input value={notice} onChange={e => setNotice(e.target.value)} className="w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white" placeholder="Optional" />
        </Field>
      </div>
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-xs text-zinc-300">
          <input type="checkbox" checked={addChannels} onChange={e => setAddChannels(e.target.checked)} /> Channels
        </label>
        <label className="flex items-center gap-2 text-xs text-zinc-300">
          <input type="checkbox" checked={addVods} onChange={e => setAddVods(e.target.checked)} /> Movies / Series
        </label>
        <label className="flex items-center gap-2 text-xs text-zinc-300">
          <input type="checkbox" checked={adults} onChange={e => setAdults(e.target.checked)} /> Adult content
        </label>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-400 hover:bg-white/10">Cancel</button>
        <button type="submit" disabled={loading} className="rounded bg-amber-500 px-4 py-1.5 text-xs font-semibold text-black hover:bg-amber-400 disabled:opacity-50">
          {loading ? "Creating…" : "Save Line"}
        </button>
      </div>
    </form>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  )
}
