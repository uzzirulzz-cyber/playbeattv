"use client"

import { useEffect, useState } from "react"
import { Loader2, Plus, Trash2, RefreshCw, Copy, Eye } from "lucide-react"
import { PLANS, BOUQUETS } from "@/lib/xtream/client"

interface ActiveCode {
  id: string
  code: string
  password: string
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
  activatedAt: string | null
}

export function AdminIptvActiveCodes() {
  const [codes, setCodes] = useState<ActiveCode[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [filter, setFilter] = useState("all")
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const reload = () => {
    fetch(`/api/admin/iptv/activecodes?status=${filter}`).then(r => r.json()).then(d => setCodes(d.codes || [])).finally(() => setLoading(false))
  }
  useEffect(reload, [filter])

  const create = async (form: any) => {
    setActionLoading("create")
    const res = await fetch("/api/admin/iptv/activecodes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", ...form }),
    })
    const d = await res.json()
    setActionLoading(null)
    if (!res.ok) { alert(d.error); return }
    setShowAdd(false)
    reload()
    alert(d.demo ? `Demo: ${d.msg}` : `Created activecode: ${d.code?.code}`)
  }

  const extend = async (c: ActiveCode) => {
    const plan = prompt(`Extend "${c.code}" by which plan?\n1=1mo, 2=3mo, 3=6mo, 4=12mo`, "1")
    if (!plan) return
    setActionLoading(`extend-${c.id}`)
    const res = await fetch("/api/admin/iptv/activecodes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "extend", id: c.id, plan: parseInt(plan) }),
    })
    const d = await res.json()
    setActionLoading(null)
    if (!res.ok) { alert(d.error); return }
    reload()
    alert(d.demo ? `Demo: ${d.msg}` : `Extended "${c.code}"`)
  }

  const remove = async (c: ActiveCode) => {
    if (!confirm(`Delete activecode "${c.code}"?`)) return
    const force = confirm("Force delete (refund credits)?")
    setActionLoading(`del-${c.id}`)
    const res = await fetch("/api/admin/iptv/activecodes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id: c.id, force }),
    })
    const d = await res.json()
    setActionLoading(null)
    if (!res.ok) { alert(d.error); return }
    reload()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 text-xs">
          {["all", "active", "expired", "deleted"].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`rounded-full px-3 py-1 capitalize ${filter === s ? "bg-white/15 text-white" : "bg-white/5 text-zinc-400 hover:bg-white/10"}`}
            >{s}</button>
          ))}
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-black hover:bg-amber-400">
          <Plus className="h-3.5 w-3.5" /> Generate Code
        </button>
      </div>

      {showAdd && <CreateActiveCodeForm onSubmit={create} onCancel={() => setShowAdd(false)} loading={actionLoading === "create"} />}

      {loading ? (
        <div className="flex justify-center py-12 text-zinc-500"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : codes.length === 0 ? (
        <div className="py-12 text-center text-zinc-500">
          <p>No activecodes yet.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {codes.map(c => (
            <div key={c.id} className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono font-semibold text-amber-200">{c.code}</code>
                    <button
                      onClick={() => navigator.clipboard?.writeText(c.code)}
                      className="text-zinc-500 hover:text-zinc-300"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                    <StatusPill status={c.status} />
                    {c.activatedAt && <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] text-emerald-300">Activated</span>}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-zinc-500">
                    <span className="rounded bg-white/5 px-1.5 py-0.5">{c.planLabel}</span>
                    <span className="rounded bg-white/5 px-1.5 py-0.5">{c.bouquetLabel}</span>
                    <span className="rounded bg-white/5 px-1.5 py-0.5">CONX {c.conx}</span>
                    {c.adults && <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-red-300">Adult</span>}
                    <span>Created {new Date(c.startsAt).toLocaleDateString()}</span>
                    {c.expiresAt && <span>· expires {new Date(c.expiresAt).toLocaleDateString()}</span>}
                  </div>
                  <p className="mt-1 text-[10px] text-zinc-600">Static password: <code className="text-zinc-400">{c.password}</code></p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => extend(c)}
                    disabled={actionLoading === `extend-${c.id}`}
                    className="flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-white hover:bg-white/10 disabled:opacity-50"
                  >
                    {actionLoading === `extend-${c.id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                    Extend
                  </button>
                  <button
                    onClick={() => remove(c)}
                    disabled={actionLoading === `del-${c.id}`}
                    className="flex items-center gap-1 rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs text-red-300 hover:bg-red-500/20 disabled:opacity-50"
                  >
                    {actionLoading === `del-${c.id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
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
  }
  return <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${map[status] || "bg-zinc-700 text-zinc-300"}`}>{status}</span>
}

function CreateActiveCodeForm({ onSubmit, onCancel, loading }: { onSubmit: (form: any) => void; onCancel: () => void; loading: boolean }) {
  const [conx, setConx] = useState(1)
  const [plan, setPlan] = useState(11)
  const [bid, setBid] = useState("[5,11]")
  const [addChannels, setAddChannels] = useState(true)
  const [addVods, setAddVods] = useState(true)
  const [adults, setAdults] = useState(false)
  const [notice, setNotice] = useState("")
  const [callback, setCallback] = useState("")

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({ conx, plan, bid, addChannels, addVods, adults, notice, callback })
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-amber-400/30 bg-amber-500/[0.03] p-4 space-y-3">
      <h4 className="text-sm font-semibold text-white">Generate ActiveCode</h4>
      <p className="text-xs text-zinc-500">
        A 14-digit numeric code will be generated automatically. The static password is <code className="rounded bg-black/40 px-1 text-zinc-300">TVSTARIPTV</code>.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
        <Field label="Callback URL (base64-encoded)">
          <input value={callback} onChange={e => setCallback(e.target.value)} className="w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white" placeholder="aHR0cHM6Ly95b3VyLi4u" />
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
          <input type="checkbox" checked={adults} onChange={e => setAdults(e.target.checked)} /> Adult
        </label>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-400 hover:bg-white/10">Cancel</button>
        <button type="submit" disabled={loading} className="rounded bg-amber-500 px-4 py-1.5 text-xs font-semibold text-black hover:bg-amber-400 disabled:opacity-50">
          {loading ? "Generating…" : "Generate Code"}
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
