"use client"

import { useEffect, useState } from "react"
import { Loader2, Heart, Tv } from "lucide-react"

export function AdminSettings() {
  const [s, setS] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch("/api/admin/import/settings").then(r => r.json()).then(d => setS(d)).finally(() => setLoading(false))
  }, [])

  const patch = async (data: any) => {
    setSaving(true)
    await fetch("/api/admin/import/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    // Reload to reflect latest
    fetch("/api/admin/import/settings").then(r => r.json()).then(d => setS(d))
  }

  if (loading || !s) return <div className="flex justify-center py-12 text-zinc-500"><Loader2 className="h-6 w-6 animate-spin" /></div>

  return (
    <div className="max-w-2xl space-y-6">
      <h2 className="text-lg font-bold text-white">Importer Settings</h2>

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
        <Toggle
          label="Auto Import"
          desc="Continuously discover new content from enabled source queries."
          value={s.autoImport}
          onChange={v => patch({ autoImport: v })}
        />
        <Toggle
          label="Auto-Publish Verified"
          desc="Publish content automatically when license is Verified. If off, all imports go to Review."
          value={s.autoPublishVerified}
          onChange={v => patch({ autoPublishVerified: v })}
        />

        <Field label="Import Frequency">
          <select value={s.importFrequency} onChange={e => patch({ importFrequency: e.target.value })} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white">
            <option value="6h">Every 6 hours</option>
            <option value="12h">Every 12 hours</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
        </Field>

        <Field label="Max imports per run">
          <select value={s.maxImportPerRun} onChange={e => patch({ maxImportPerRun: parseInt(e.target.value) })} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white">
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={250}>250</option>
          </select>
        </Field>

        <Field label="Minimum duration (seconds)">
          <input type="number" min={0} max={3600} value={s.minDurationSec} onChange={e => patch({ minDurationSec: parseInt(e.target.value || "60") })} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white" />
          <p className="mt-1 text-xs text-zinc-500">Reject videos shorter than this unless explicitly marked as Short.</p>
        </Field>

        {saving && <p className="text-xs text-cyan-300">Saving…</p>}
        {saved && <p className="text-xs text-emerald-300">Saved.</p>}
      </div>

      <div className="rounded-xl border border-amber-400/20 bg-amber-500/[0.04] p-5">
        <h3 className="text-sm font-semibold text-amber-200 flex items-center gap-2">
          <Heart className="h-4 w-4" /> API configuration
        </h3>
        <ul className="mt-2 space-y-1 text-xs">
          <li className="flex items-center gap-2">
            <Dot on={s.youtubeApiKeySet} />
            <span className="text-zinc-300">YOUTUBE_API_KEY — set in environment</span>
          </li>
          <li className="flex items-center gap-2">
            <Dot on={s.authConfigured} />
            <span className="text-zinc-300">ADMIN_TOKEN — protects admin endpoints</span>
          </li>
        </ul>
        {!s.youtubeApiKeySet && (
          <p className="mt-3 text-xs text-amber-200/70">
            YouTube imports require a Google Cloud API key with the YouTube Data API v3 enabled.
            Without it, only Wikimedia Commons imports work.
          </p>
        )}
        {!s.authConfigured && (
          <p className="mt-2 text-xs text-amber-200/70">
            Admin endpoints are currently open in dev mode. Set <code className="rounded bg-black/30 px-1 py-0.5">ADMIN_TOKEN</code> to secure them.
          </p>
        )}
      </div>

      <div className="rounded-xl border border-amber-400/20 bg-amber-500/[0.04] p-5">
        <h3 className="text-sm font-semibold text-amber-200 flex items-center gap-2">
          <Tv className="h-4 w-4" /> Premium IPTV (reseller) configuration
        </h3>
        <ul className="mt-2 space-y-1 text-xs">
          <li className="flex items-center gap-2">
            <Dot on={s.xtreamApikeySet} />
            <span className="text-zinc-300">XTREAM_API_KEY — set in environment</span>
          </li>
          <li className="flex items-center gap-2">
            <Dot on={!!s.xtreamServerUrl} />
            <span className="text-zinc-300">XTREAM_SERVER_URL — e.g. <code className="rounded bg-black/30 px-1 py-0.5">http://your-panel.tld:80</code></span>
          </li>
          <li className="flex items-center gap-2">
            <Dot on={!!s.iptvEnabled} />
            <span className="text-zinc-300">Premium IPTV module enabled in DB settings</span>
          </li>
        </ul>
        {!s.xtreamApikeySet && (
          <p className="mt-3 text-xs text-amber-200/70">
            Without XTREAM_API_KEY, the IPTV module runs in demo mode — UI is fully explorable but no real reseller API calls are made. Set the key + server URL and click below to go live.
          </p>
        )}
        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={async () => {
              await fetch("/api/admin/import/settings", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ iptvEnabled: !s.iptvEnabled }),
              })
              // reload
              fetch("/api/admin/import/settings").then(r => r.json()).then(d => setS(d))
            }}
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-400"
          >
            {s.iptvEnabled ? "Disable IPTV module" : "Enable IPTV module"}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
        <h3 className="text-sm font-semibold text-white">Content Health Check</h3>
        <p className="mt-1 text-xs text-zinc-400">Validates that source URLs still resolve and embedding is still allowed.</p>
        <button
          onClick={async () => {
            const res = await fetch("/api/admin/health", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ limit: 20 }) })
            const d = await res.json()
            alert(`Checked ${d.checked} items. ${d.results.filter((r: any) => !r.available).length} became unavailable.`)
          }}
          className="mt-3 rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20"
        >
          Run health check (20 items)
        </button>
        <p className="mt-2 text-xs text-zinc-500">
          Unavailable items are marked but <strong className="text-zinc-300">user history is preserved</strong>.
        </p>
      </div>
    </div>
  )
}

function Toggle({ label, desc, value, onChange }: { label: string; desc?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`mt-0.5 relative h-5 w-9 rounded-full transition-colors ${value ? "bg-cyan-500" : "bg-zinc-700"}`}
      >
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${value ? "translate-x-4" : "translate-x-0.5"}`} />
      </button>
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        {desc && <p className="text-xs text-zinc-500">{desc}</p>}
      </div>
    </label>
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
function Dot({ on }: { on: boolean }) {
  return <span className={`inline-block h-2 w-2 rounded-full ${on ? "bg-emerald-400" : "bg-zinc-600"}`} />
}
