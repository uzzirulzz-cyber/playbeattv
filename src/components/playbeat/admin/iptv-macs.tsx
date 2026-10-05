"use client"

import { useEffect, useState } from "react"
import { Loader2, Plus, Trash2, RefreshCw, Pencil } from "lucide-react"
import { PLANS, BOUQUETS } from "@/lib/xtream/client"

interface Mac {
  id: string
  address: string
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

export function AdminIptvMacs() {
  const [macs, setMacs] = useState<Mac[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [filter, setFilter] = useState("all")
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const reload = () => {
    fetch(`/api/admin/iptv/macs?status=${filter}`).then(r => r.json()).then(d => setMacs(d.macs || [])).finally(() => setLoading(false))
  }
  useEffect(reload, [filter])

  const create = async (form: any) => {
    setActionLoading("create")
    const res = await fetch("/api/admin/iptv/macs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", ...form }),
    })
    const d = await res.json()
    setActionLoading(null)
    if (!res.ok) { alert(d.error); return }
    setShowAdd(false)
    reload()
    alert(d.demo ? `Demo: ${d.msg}` : `Registered MAC ${form.address}`)
  }

  const extend = async (m: Mac) => {
    const plan = prompt(`Extend MAC "${m.address}" by which plan?\n1=1mo, 2=3mo, 3=6mo, 4=12mo`, "1")
    if (!plan) return
    setActionLoading(`extend-${m.id}`)
    const res = await fetch("/api/admin/iptv/macs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "extend", id: m.id, plan: parseInt(plan) }),
    })
    const d = await res.json()
    setActionLoading(null)
    if (!res.ok) { alert(d.error); return }
    reload()
  }

  const remove = async (m: Mac) => {
    if (!confirm(`Delete MAC "${m.address}"?`)) return
    const force = confirm("Force delete (refund credits)?")
    setActionLoading(`del-${m.id}`)
    const res = await fetch("/api/admin/iptv/macs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id: m.id, force }),
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
          <Plus className="h-3.5 w-3.5" /> Register MAC
        </button>
      </div>

      {showAdd && <CreateMacForm onSubmit={create} onCancel={() => setShowAdd(false)} loading={actionLoading === "create"} />}

      {loading ? (
        <div className="flex justify-center py-12 text-zinc-500"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : macs.length === 0 ? (
        <div className="py-12 text-center text-zinc-500">
          <p>No MAC addresses yet.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {macs.map(m => (
            <div key={m.id} className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono font-semibold text-cyan-200">{m.address}</code>
                    <StatusPill status={m.status} />
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-zinc-500">
                    <span className="rounded bg-white/5 px-1.5 py-0.5">{m.planLabel}</span>
                    <span className="rounded bg-white/5 px-1.5 py-0.5">{m.bouquetLabel}</span>
                    <span className="rounded bg-white/5 px-1.5 py-0.5">CONX {m.conx}</span>
                    {m.adults && <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-red-300">Adult</span>}
                    <span>Registered {new Date(m.startsAt).toLocaleDateString()}</span>
                    {m.expiresAt && <span>· expires {new Date(m.expiresAt).toLocaleDateString()}</span>}
                  </div>
                  {m.notice && <p className="mt-1 text-[10px] text-zinc-600">Notice: {m.notice}</p>}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => extend(m)}
                    disabled={actionLoading === `extend-${m.id}`}
                    className="flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-white hover:bg-white/10 disabled:opacity-50"
                  >
                    {actionLoading === `extend-${m.id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                    Extend
                  </button>
                  <button
                    onClick={() => remove(m)}
                    disabled={actionLoading === `del-${m.id}`}
                    className="flex items-center gap-1 rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs text-red-300 hover:bg-red-500/20 disabled:opacity-50"
                  >
                    {actionLoading === `del-${m.id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
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

function CreateMacForm({ onSubmit, onCancel, loading }: { onSubmit: (form: any) => void; onCancel: () => void; loading: boolean }) {
  const [address, setAddress] = useState("00:")
  const [conx, setConx] = useState(1)
  const [plan, setPlan] = useState(11)
  const [bid, setBid] = useState("[5,11]")
  const [addChannels, setAddChannels] = useState(true)
  const [addVods, setAddVods] = useState(true)
  const [adults, setAdults] = useState(false)
  const [notice, setNotice] = useState("")

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/.test(address)) {
      alert("Invalid MAC format. Use 00:AA:BB:CC:DD:11")
      return
    }
    onSubmit({ address, conx, plan, bid, addChannels, addVods, adults, notice })
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-amber-400/30 bg-amber-500/[0.03] p-4 space-y-3">
      <h4 className="text-sm font-semibold text-white">Register MAC address</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="MAC address (00:AA:BB:CC:DD:11)">
          <input value={address} onChange={e => setAddress(e.target.value.toUpperCase())} className="w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white font-mono" placeholder="00:1A:2B:3C:4D:5E" />
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
          <input type="checkbox" checked={adults} onChange={e => setAdults(e.target.checked)} /> Adult
        </label>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-400 hover:bg-white/10">Cancel</button>
        <button type="submit" disabled={loading} className="rounded bg-amber-500 px-4 py-1.5 text-xs font-semibold text-black hover:bg-amber-400 disabled:opacity-50">
          {loading ? "Registering…" : "Register MAC"}
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
