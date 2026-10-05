import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET() {
  const [content, series] = await Promise.all([
    db.content.findMany({
      where: { published: true },
      select: { slug: true, type: true, updatedAt: true },
    }),
    db.series.findMany({
      where: { published: true },
      select: { slug: true, updatedAt: true },
    }),
  ])
  const episodes = await db.episode.findMany({
    where: { published: true },
    select: { slug: true, seasonNumber: true, episodeNumber: true, series: { select: { slug: true } }, updatedAt: true },
  })
  const base = "https://playbeattv.buzz"
  const urls: { loc: string; lastmod?: string }[] = [{ loc: `${base}/` }]
  for (const c of content) {
    urls.push({ loc: `${base}/movie/${c.slug}`, lastmod: c.updatedAt.toISOString() })
  }
  for (const s of series) {
    urls.push({ loc: `${base}/series/${s.slug}`, lastmod: s.updatedAt.toISOString() })
  }
  for (const ep of episodes) {
    urls.push({
      loc: `${base}/series/${ep.series.slug}/season/${ep.seasonNumber}/episode/${ep.episodeNumber}`,
      lastmod: ep.updatedAt.toISOString(),
    })
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${u.loc}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ""}
  </url>`).join("\n")}
</urlset>`
  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=300",
    },
  })
}
