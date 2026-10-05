// Seed: source query library, homepage rows, default settings.
// Then attempt a real Wikimedia Commons import so the demo has content.

import { PrismaClient } from "@prisma/client"
import { importSearch } from "../src/lib/import/engine"

const db = new PrismaClient()

async function main() {
  console.log("-> Ensuring settings singleton exists")
  await db.settings.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      autoImport: false,
      autoPublishVerified: true,
      importFrequency: "daily",
      maxImportPerRun: 50,
      minDurationSec: 60,
    },
  })

  console.log("-> Seeding source query library")
  const queries: { query: string; source: "youtube" | "wikimedia" }[] = [
    { query: "public domain full movies",                  source: "youtube" },
    { query: "creative commons movies",                   source: "youtube" },
    { query: "public domain classic films",                source: "youtube" },
    { query: "creative commons documentary",              source: "youtube" },
    { query: "public domain animation",                    source: "wikimedia" },
    { query: "independent short films creative commons",   source: "youtube" },
    { query: "official free web series",                   source: "youtube" },
    { query: "official mini series",                      source: "youtube" },
    { query: "public domain science fiction",              source: "youtube" },
    { query: "public domain horror movies",                source: "youtube" },
    { query: "public domain comedy",                       source: "youtube" },
    { query: "public domain western movies",               source: "youtube" },
    { query: "classic cinema public domain",               source: "youtube" },
    { query: "public domain film",                         source: "wikimedia" },
    { query: "public domain documentary",                  source: "wikimedia" },
    { query: "classic film webm",                          source: "wikimedia" },
    { query: "public domain animation film",               source: "wikimedia" },
    { query: "creative commons video",                     source: "wikimedia" },
    { query: "historical footage",                         source: "wikimedia" },
    { query: "educational film public domain",             source: "wikimedia" },
  ]
  for (const q of queries) {
    const existing = await db.sourceQuery.findFirst({ where: q })
    if (!existing) {
      await db.sourceQuery.create({ data: { ...q, enabled: true } })
    }
  }
  console.log(`  ${queries.length} source queries ready`)

  console.log("-> Seeding homepage rows")
  const rows: { key: string; title: string; filterType: string; filterJson: any; order: number }[] = [
    { key: "featured",         title: "Featured",         filterType: "dynamic", filterJson: { limit: 12 },                       order: 1 },
    { key: "trending_now",     title: "Trending Now",     filterType: "dynamic", filterJson: { limit: 12 },                       order: 2 },
    { key: "recently_added",   title: "Recently Added",   filterType: "dynamic", filterJson: { limit: 12 },                       order: 3 },
    { key: "free_movies",      title: "Free Movies",      filterType: "dynamic", filterJson: { type: "movie", limit: 12 },        order: 4 },
    { key: "web_series",       title: "Web Series",       filterType: "dynamic", filterJson: { limit: 12 },                       order: 5 },
    { key: "classic_cinema",   title: "Classic Cinema",   filterType: "dynamic", filterJson: { genre: "Classic Cinema", limit: 12 }, order: 6 },
    { key: "documentaries",    title: "Documentaries",    filterType: "dynamic", filterJson: { type: "documentary", limit: 12 },   order: 7 },
    { key: "animation",        title: "Animation",        filterType: "dynamic", filterJson: { type: "animation", limit: 12 },     order: 8 },
    { key: "short_films",      title: "Short Films",      filterType: "dynamic", filterJson: { type: "short", limit: 12 },          order: 9 },
    { key: "action",           title: "Action",           filterType: "dynamic", filterJson: { genre: "Action", limit: 12 },       order: 10 },
    { key: "comedy",           title: "Comedy",           filterType: "dynamic", filterJson: { genre: "Comedy", limit: 12 },       order: 11 },
    { key: "drama",            title: "Drama",            filterType: "dynamic", filterJson: { genre: "Drama", limit: 12 },        order: 12 },
    { key: "new_episodes",     title: "New Episodes",     filterType: "dynamic", filterJson: { limit: 12 },                       order: 13 },
    { key: "editors_picks",    title: "Editors' Picks",   filterType: "dynamic", filterJson: { genre: "Indie", limit: 12 },         order: 14 },
  ]
  for (const r of rows) {
    const existing = await db.homepageRow.findUnique({ where: { key: r.key } })
    if (!existing) {
      await db.homepageRow.create({
        data: {
          key: r.key,
          title: r.title,
          filterType: r.filterType,
          filterJson: JSON.stringify(r.filterJson),
          order: r.order,
        },
      })
    } else {
      await db.homepageRow.update({
        where: { id: existing.id },
        data: { title: r.title, order: r.order },
      })
    }
  }
  console.log(`  ${rows.length} homepage rows ready`)

  console.log("-> Importing real Wikimedia Commons content (no API key needed)")
  try {
    const summary = await importSearch({
      source: "wikimedia",
      contentType: "all",
      maxResults: 30,
      licenseFilter: "all_verified",
      requestedBy: "system:seed",
    })
    console.log("  Wikimedia import:", summary.job)
  } catch (e: any) {
    console.warn("  Wikimedia import failed:", e.message || String(e))
  }

  console.log("Seed complete")
}

main()
  .catch((e) => {
    console.error("Seed failed:", e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
