"use client"

import { useEffect, useState } from "react"
import { Loader2, Tv, Zap, AlertCircle } from "lucide-react"
import { useApp } from "@/stores/app"
import { AdminIptvLines } from "./iptv-lines"
import { AdminIptvActiveCodes } from "./iptv-activecodes"
import { AdminIptvMacs } from "./iptv-macs"
import { AdminIptvLogs } from "./iptv-logs"
import { AdminIptvOverview } from "./iptv-overview"

export function AdminIptv() {
  const { adminView, setAdminView } = useApp()

  const tabs = [
    { v: "iptv-overview",    l: "Overview" },
    { v: "iptv-lines",       l: "Xtream Lines" },
    { v: "iptv-activecodes", l: "ActiveCodes" },
    { v: "iptv-macs",        l: "Mac Addresses" },
    { v: "iptv-logs",        l: "Credit Logs" },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Premium IPTV</h2>
        <div className="flex items-center gap-1 text-xs">
          {tabs.map(t => (
            <button
              key={t.v}
              onClick={() => setAdminView(t.v as any)}
              className={`rounded-full px-3 py-1.5 font-medium transition-colors ${
                adminView === t.v ? "bg-amber-500/20 text-amber-200 ring-1 ring-amber-400/40" : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              {t.l}
            </button>
          ))}
        </div>
      </div>

      {adminView === "iptv-overview" && <AdminIptvOverview />}
      {adminView === "iptv-lines" && <AdminIptvLines />}
      {adminView === "iptv-activecodes" && <AdminIptvActiveCodes />}
      {adminView === "iptv-macs" && <AdminIptvMacs />}
      {adminView === "iptv-logs" && <AdminIptvLogs />}
    </div>
  )
}
