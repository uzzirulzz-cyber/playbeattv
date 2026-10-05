// Seed a real IPTV subscription as an active IptvLine.
//
// This is a TEMPLATE — copy to scripts/seed-iptv-line.local.ts and fill in
// your real credentials. The .local.ts file is gitignored.
//
// Usage:
//   1. cp scripts/seed-iptv-line.template.ts scripts/seed-iptv-line.local.ts
//   2. Edit the values below
//   3. bun run scripts/seed-iptv-line.local.ts
//
// Or set the values via env vars:
//   IPTV_SERVER_URL=http://your-panel.tld:8080 \
//   IPTV_USERNAME=your_username \
//   IPTV_PASSWORD=your_password \
//   IPTV_EXPIRY=2026-11-02 \
//   bun run scripts/seed-iptv-line.template.ts

import { PrismaClient } from "@prisma/client"
const db = new PrismaClient()

const SERVER_URL = process.env.IPTV_SERVER_URL || "http://your-panel.tld:8080"
const USERNAME = process.env.IPTV_USERNAME || "your_username"
const PASSWORD = process.env.IPTV_PASSWORD || "your_password"
const EXPIRY_STR = process.env.IPTV_EXPIRY || "2026-11-02"
const EXPIRY = new Date(EXPIRY_STR + "T23:59:59Z")
const NOTICE = process.env.IPTV_NOTICE || "World Package, Channels + Vods"

async function main() {
  console.log(`→ Seeding IPTV line: ${USERNAME} @ ${SERVER_URL} (expires ${EXPIRY_STR})`)

  const existing = await db.iptvLine.findUnique({ where: { username: USERNAME } })
  if (existing) {
    console.log(`  Already exists (id=${existing.id}). Updating.`)
    await db.iptvLine.update({
      where: { id: existing.id },
      data: {
        serverUrl: SERVER_URL,
        password: PASSWORD,
        expiresAt: EXPIRY,
        status: "active",
        notice: NOTICE,
        adults: true,
        bid: "[4,7]",
        plan: 4, // 12 months
        conx: 1,
        addChannels: true,
        addVods: true,
      },
    })
  } else {
    const created = await db.iptvLine.create({
      data: {
        username: USERNAME,
        password: PASSWORD,
        serverUrl: SERVER_URL,
        plan: 4,
        bid: "[4,7]",
        conx: 1,
        addChannels: true,
        addVods: true,
        adults: true,
        notice: NOTICE,
        status: "active",
        startsAt: new Date(),
        expiresAt: EXPIRY,
      },
    })
    console.log(`  Created id=${created.id}`)
  }

  // Sanity fetch
  console.log("→ Sanity-checking M3U fetch")
  try {
    const url = `${SERVER_URL}/get.php?username=${USERNAME}&password=${PASSWORD}&type=m3u_plus`
    const res = await fetch(url, { signal: AbortSignal.timeout(15000), headers: { "User-Agent": "PlayBeatTV/1.0" } })
    if (!res.ok) {
      console.warn(`  M3U fetch returned HTTP ${res.status}`)
    } else {
      const text = await res.text()
      const lineCount = text.split("\n").filter((l: string) => l.startsWith("#EXTINF")).length
      console.log(`  M3U OK: ${lineCount} channels available`)
    }
  } catch (e: any) {
    console.warn(`  M3U fetch failed: ${e.message || String(e)}`)
  }

  console.log("✅ Done")
}

main().catch(e => {
  console.error("Seed failed:", e)
  process.exit(1)
}).finally(() => db.$disconnect())
