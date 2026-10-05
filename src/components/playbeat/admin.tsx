"use client"

import { useEffect, useState } from "react"
import { useApp } from "@/stores/app"
import { AdminDashboard } from "./admin/dashboard"
import { AdminImportUrl } from "./admin/import-url"
import { AdminImportSearch } from "./admin/import-search"
import { AdminImportBulk } from "./admin/import-bulk"
import { AdminContent } from "./admin/content"
import { AdminSeries } from "./admin/series"
import { AdminAudit } from "./admin/audit"
import { AdminSettings } from "./admin/settings"
import { AdminQueries } from "./admin/queries"
import { AdminRows } from "./admin/rows"
import { AdminJobs } from "./admin/jobs"
import { AdminLogin } from "./admin/login"

export function AdminView() {
  const { adminView, isAdmin } = useApp()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    fetch("/api/admin/status").then(r => r.json()).then(d => {
      useApp.getState().setAdmin(d.admin)
      setChecked(true)
    }).catch(() => setChecked(true))
  }, [adminView])

  if (!checked) return <div className="py-20 text-center text-zinc-500">Loading admin…</div>
  if (!isAdmin) return <AdminLogin />

  return (
    <div className="mx-auto max-w-[1600px] px-4 sm:px-8 py-6">
      <AdminNav />
      <div className="mt-6">
        {adminView === "dashboard" && <AdminDashboard />}
        {adminView === "import-url" && <AdminImportUrl />}
        {adminView === "import-search" && <AdminImportSearch />}
        {adminView === "import-bulk" && <AdminImportBulk />}
        {adminView === "content" && <AdminContent />}
        {adminView === "series" && <AdminSeries />}
        {adminView === "audit" && <AdminAudit />}
        {adminView === "settings" && <AdminSettings />}
        {adminView === "queries" && <AdminQueries />}
        {adminView === "rows" && <AdminRows />}
        {adminView === "jobs" && <AdminJobs />}
      </div>
    </div>
  )
}

function AdminNav() {
  const { adminView, setAdminView } = useApp()
  const items = [
    { v: "dashboard",    l: "Dashboard" },
    { v: "import-url",    l: "Quick Import" },
    { v: "import-search", l: "Search Import" },
    { v: "import-bulk",   l: "Bulk Discovery" },
    { v: "jobs",          l: "Import Jobs" },
    { v: "content",       l: "Content" },
    { v: "series",        l: "Series" },
    { v: "queries",       l: "Query Library" },
    { v: "rows",          l: "Homepage Rows" },
    { v: "audit",         l: "Audit Log" },
    { v: "settings",      l: "Settings" },
  ]
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-white/10 pb-3">
      <span className="mr-3 text-xs font-semibold uppercase tracking-wider text-violet-300">Admin</span>
      {items.map(it => (
        <button
          key={it.v}
          onClick={() => setAdminView(it.v as any)}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            adminView === it.v ? "bg-violet-500/30 text-violet-200 ring-1 ring-violet-400/40" : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"
          }`}
        >
          {it.l}
        </button>
      ))}
    </div>
  )
}
