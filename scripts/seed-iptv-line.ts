// Seed a real IPTV subscription as an active IptvLine.
// Usage: bun run scripts/seed-iptv-line.ts

import { PrismaClient } from "@prisma/client"
const db = new PrismaClient()

// Real subscription credentials (provided by user via chat).
// IMPORTANT: in production these would come from the admin UI / a customer signup flow,
// not be hardcoded in a script.
const SERVER_URL = "http://geotv.space:8880"
const USERNAME = "9ca33be7"
const PASSWORD = "2cc19fe5"
const EXPIRY = new Date("2026-11-02T23:59:59Z")  // 02-11-2026 per user
const NOTICE = "World Package, Channels + Vods (+Adult), 1 connection — stariptv.pk"

async function main() {
  console.log("→ Seeding real IPTV subscription as an IptvLine")

  // Don't re-create if a line with this username already exists
  const existing = await db.iptvLine.findUnique({ where: { username: USERNAME } })
  if (existing) {
    console.log(`  Already exists (id=${existing.id}). Updating serverUrl + expiry + status.`)
    const updated = await db.iptvLine.update({
      where: { id: existing.id },
      data: {
        serverUrl: SERVER_URL,
        password: PASSWORD,
        expiresAt: EXPIRY,
        status: "active",
        notice: NOTICE,
        adults: true,
        // World Package = full worldwide subscription with adult content
        bid: "[4,7]",
        plan: 4, // 12 months
        conx: 1,
        addChannels: true,
        addVods: true,
      },
    })
    console.log(`  Updated id=${updated.id}`)
  } else {
    const created = await db.iptvLine.create({
      data: {
        username: USERNAME,
        password: PASSWORD,
        serverUrl: SERVER_URL,
        plan: 4, // 12 months
        bid: "[4,7]", // Full worldwide subscription (with adult)
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

  // Quick sanity fetch of the M3U to confirm credentials still work
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

  console.log("✅ Done — public Live TV view will now pull from geotv.space")
}

main().catch(e => {
  console.error("Seed failed:", e)
  process.exit(1)
}).finally(() => db.$disconnect())
