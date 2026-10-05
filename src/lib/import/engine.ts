// ContentImportEngine — orchestrates discover → fetch → verify → classify → save → publish.
//
// All side-effecting work goes through here so we can enforce:
//  - duplicate detection (by source, sourceId, normalized title+year, episode key)
//  - quality rules (reject trailers, fan edits, screen recordings, etc.)
//  - license verification + auto-publish gate
//  - audit logging

import { db } from "@/lib/db"
import {
  searchYouTubeVideos,
  searchWikimediaVideos,
  type DiscoveredItem,
} from "./sources"
import { classifyType, detectGenres, detectLanguage, type ContentType } from "./classifier"
import { detectEpisode, detectMovie, detectShort } from "./detector"
import {
  verifyYouTubeLicense,
  verifyWikimediaLicense,
  verifyDirectStream,
  verifyPlaybeatOwned,
  type LicenseDecision,
} from "./license"
import {
  slugify, normalizeTitle, extractYear, jsonStringify,
  buildSeo,
} from "./util"
import { parseYouTubeUrl } from "./youtube"

export interface ImportOptions {
  source: "youtube" | "wikimedia" | "direct"
  contentType?: "movies" | "series" | "documentaries" | "animation" | "shorts" | "all"
  language?: string
  minDurationSec?: number
  maxResults?: number
  licenseFilter?: "public_domain" | "creative_commons" | "official_embeddable" | "all_verified" | "any"
  jobId?: string
  requestedBy?: string
  ip?: string
}

export interface ImportSummary {
  job: {
    id: string
    discovered: number
    imported: number
    published: number
    duplicates: number
    rejected: number
    reviewRequired: number
    errors: number
    log: string[]
  }
}

// =========================================================
// URL IMPORT — single URL
// =========================================================
export async function importByUrl(opts: {
  url: string
  source?: "youtube" | "wikimedia" | "direct"
  declaredLicense?: string
  attribution?: string
  requestedBy?: string
  ip?: string
}): Promise<{ ok: boolean; contentId?: string; episodeId?: string; reason: string }> {
  const url = opts.url.trim()
  const source = opts.source || detectSourceFromUrl(url)
  const requestedBy = opts.requestedBy || "admin"
  const log: string[] = [`Importing ${url} (source=${source})`]

  try {
    if (source === "youtube") {
      const videoId = parseYouTubeUrl(url)
      if (!videoId) return { ok: false, reason: "Could not parse YouTube URL" }
      const items = await searchYouTubeVideos({ query: "", maxResults: 0, ids: [videoId] })
      if (items.length === 0) return { ok: false, reason: "Video not found or API key missing" }
      const result = await saveDiscoveredItem(items[0], { source: "youtube", requestedBy: opts.requestedBy, ip: opts.ip })
      return { ok: result.saved, contentId: result.contentId, episodeId: result.episodeId, reason: result.reason }
    }
    if (source === "wikimedia") {
      // Expect a Commons file URL like https://commons.wikimedia.org/wiki/File:Foo.webm
      const m = url.match(/\/wiki\/(File:.+)$/i) || url.match(/\/wiki\/(.+)$/i)
      const fileName = m ? decodeURIComponent(m[1]) : url
      const items = await searchWikimediaVideos({ query: "", maxResults: 0, fileName })
      if (items.length === 0) return { ok: false, reason: "Wikimedia file not found or not a video" }
      const result = await saveDiscoveredItem(items[0], { source: "wikimedia", requestedBy: opts.requestedBy, ip: opts.ip })
      return { ok: result.saved, contentId: result.contentId, episodeId: result.episodeId, reason: result.reason }
    }
    if (source === "direct") {
      const decision = verifyDirectStream({
        declaredLicense: opts.declaredLicense,
        attribution: opts.attribution,
        sourceUrl: url,
      })
      const title = url.split("/").pop()?.replace(/\.[^.]+$/, "") || "Untitled"
      const slug = await uniqueSlug(slugify(title))
      const content = await db.content.create({
        data: {
          title, slug,
          type: "other",
          description: "",
          sourceProvider: "direct",
          sourceId: url,
          originalUrl: url,
          streamUrl: url,
          licenseType: decision.type,
          licenseVerified: decision.verified,
          licenseStatus: decision.status,
          licenseAttribution: decision.attribution,
          licenseSourceUrl: decision.sourceUrl,
          licenseCheckedAt: new Date(),
          published: decision.verified,
          seoJson: buildSeo({ title, description: "", canonical: `/movie/${slug}` }),
        },
      })
      await logAudit({
        actor: requestedBy,
        action: "content.imported",
        targetType: "content",
        target: content.id,
        detail: { url, decision },
        ip: opts.ip,
      })
      return { ok: true, contentId: content.id, reason: `Imported as ${decision.status}` }
    }
    return { ok: false, reason: "Unknown source" }
  } catch (e: any) {
    log.push(`ERROR: ${e.message || String(e)}`)
    return { ok: false, reason: e.message || String(e) }
  }
}

// =========================================================
// BULK IMPORT — search + bulk save
// =========================================================
export async function importSearch(opts: ImportOptions): Promise<ImportSummary> {
  const job = await db.importJob.create({
    data: {
      source: opts.source,
      query: "",
      contentType: opts.contentType || "all",
      language: opts.language,
      licenseFilter: opts.licenseFilter || "any",
      minDuration: opts.minDurationSec,
      maxResults: opts.maxResults || 25,
      requestedBy: opts.requestedBy || "system",
      log: "[]",
    },
  })
  await logAudit({
    actor: opts.requestedBy || "system",
    action: "import.run",
    targetType: "job",
    target: job.id,
    detail: { source: opts.source, options: opts },
    ip: opts.ip,
    jobId: job.id,
  })

  const log: string[] = [`Started import job ${job.id} (${opts.source})`]
  let stats = { discovered: 0, imported: 0, published: 0, duplicates: 0, rejected: 0, reviewRequired: 0, errors: 0 }

  try {
    const queries = await getQueriesForJob(opts)
    for (const q of queries) {
      log.push(`Searching "${q}"`)
      let items: DiscoveredItem[] = []
      if (opts.source === "youtube") {
        items = await searchYouTubeVideos({
          query: q,
          maxResults: Math.ceil((opts.maxResults || 25) / Math.max(queries.length, 1)),
          licenseFilter: opts.licenseFilter,
        })
      } else if (opts.source === "wikimedia") {
        items = await searchWikimediaVideos({
          query: q,
          maxResults: Math.ceil((opts.maxResults || 25) / Math.max(queries.length, 1)),
        })
      }
      stats.discovered += items.length
      log.push(`Discovered ${items.length} from "${q}"`)

      // Respect global cap
      if (stats.imported >= (opts.maxResults || 25)) break

      for (const item of items) {
        if (stats.imported >= (opts.maxResults || 25)) break
        const result = await saveDiscoveredItem(item, { source: opts.source, requestedBy: opts.requestedBy, ip: opts.ip, jobId: job.id })
        if (result.saved) {
          stats.imported++
          if (result.published) stats.published++
          if (result.reviewRequired) stats.reviewRequired++
        } else if (result.reason.startsWith("duplicate")) stats.duplicates++
        else if (result.reason.startsWith("rejected")) stats.rejected++
        else stats.errors++
      }
    }
  } catch (e: any) {
    log.push(`FATAL: ${e.message || String(e)}`)
    stats.errors++
  }

  log.push(`Completed: discovered=${stats.discovered} imported=${stats.imported} published=${stats.published} dup=${stats.duplicates} rejected=${stats.rejected} review=${stats.reviewRequired} errors=${stats.errors}`)

  await db.importJob.update({
    where: { id: job.id },
    data: {
      status: stats.errors > 0 && stats.imported === 0 ? "failed" : "completed",
      ...stats,
      log: jsonStringify(log),
      completedAt: new Date(),
    },
  })

  await logAudit({
    actor: opts.requestedBy || "system",
    action: "import.completed",
    targetType: "job",
    target: job.id,
    detail: stats,
    ip: opts.ip,
    jobId: job.id,
  })

  return { job: { id: job.id, ...stats, log } }
}

// =========================================================
// SAVE DISCOVERED ITEM — dedup + classify + persist
// =========================================================
interface SaveResult {
  saved: boolean
  published: boolean
  reviewRequired: boolean
  contentId?: string
  episodeId?: string
  reason: string
}

async function saveDiscoveredItem(
  item: DiscoveredItem,
  ctx: { source: string; requestedBy?: string; ip?: string; jobId?: string }
): Promise<SaveResult> {
  const log: string[] = []
  // Quality gate: anti-movie patterns
  if (item.antiMoviePattern) {
    log.push("rejected: anti-movie pattern")
    await createImportJobItem(ctx.jobId, item, "rejected", "anti-movie pattern")
    return { saved: false, published: false, reviewRequired: false, reason: "rejected: anti-movie pattern" }
  }

  // Quality gate: minimum duration (unless short)
  if (item.duration != null && item.duration < 60 && !item.isShort) {
    log.push(`rejected: duration ${item.duration}s < 60s minimum`)
    await createImportJobItem(ctx.jobId, item, "rejected", "too short")
    return { saved: false, published: false, reviewRequired: false, reason: "rejected: too short" }
  }

  // Duplicate check
  const dup = await findDuplicate({
    sourceProvider: item.sourceProvider,
    sourceId: item.sourceId,
    title: item.title,
    year: item.year,
  })
  if (dup) {
    log.push(`duplicate: matched id=${dup.id}`)
    await createImportJobItem(ctx.jobId, item, "duplicate", `matches ${dup.id}`)
    return { saved: false, published: false, reviewRequired: false, reason: `duplicate: ${dup.id}` }
  }

  // License decision
  const decision = item.licenseDecision

  // Detect movie/episode/etc.
  const episodeInfo = detectEpisode(item.title)
  const isEpisode = episodeInfo.isEpisode
  const movieSignals = detectMovie({
    title: item.title,
    description: item.description,
    duration: item.duration,
    tags: item.tags,
  })
  const isShort = detectShort({
    title: item.title,
    description: item.description,
    duration: item.duration,
    tags: item.tags,
  })
  const contentType = classifyType({
    title: item.title,
    description: item.description,
    duration: item.duration,
    isEpisode,
    tags: item.tags,
  })

  const genres = detectGenres({
    title: item.title,
    description: item.description,
    tags: item.tags,
  })
  const languages = detectLanguage({
    metadataLanguage: item.metadataLanguage,
    title: item.title,
    description: item.description,
    tags: item.tags,
  })
  const year = item.year || extractYear(item.title)

  const published = decision.verified

  if (isEpisode) {
    // Find or create series + season, then attach episode
    const seriesSlug = slugify(episodeInfo.seriesTitle)
    const series = await findOrCreateSeries({
      title: episodeInfo.seriesTitle,
      slug: seriesSlug,
      description: item.description,
      poster: item.thumbnail,
      backdrop: item.thumbnail,
      genres, languages,
      sourceProvider: item.sourceProvider,
      sourceChannel: item.channelTitle,
      published,
    })
    const season = await findOrCreateSeason(series.id, episodeInfo.seasonNumber)
    const epSlug = `${seriesSlug}-s${episodeInfo.seasonNumber}-e${episodeInfo.episodeNumber}`

    const existingEp = await db.episode.findUnique({
      where: {
        seriesId_seasonNumber_episodeNumber: {
          seriesId: series.id,
          seasonNumber: episodeInfo.seasonNumber,
          episodeNumber: episodeInfo.episodeNumber,
        },
      },
    })
    if (existingEp) {
      await createImportJobItem(ctx.jobId, item, "duplicate", `episode matches ${existingEp.id}`)
      return { saved: false, published: false, reviewRequired: false, reason: `duplicate: episode ${existingEp.id}` }
    }

    const episode = await db.episode.create({
      data: {
        seriesId: series.id,
        seasonId: season.id,
        seasonNumber: episodeInfo.seasonNumber,
        episodeNumber: episodeInfo.episodeNumber,
        title: item.title,
        slug: epSlug,
        description: item.description,
        duration: item.duration,
        thumbnail: item.thumbnail,
        sourceProvider: item.sourceProvider,
        sourceId: item.sourceId,
        originalUrl: item.originalUrl,
        embedUrl: item.embedUrl,
        streamUrl: item.streamUrl,
        licenseType: decision.type,
        licenseVerified: decision.verified,
        licenseAttribution: decision.attribution,
        licenseSourceUrl: decision.sourceUrl,
        licenseStatus: decision.status,
        published,
        seoJson: buildSeo({
          title: item.title,
          description: item.description,
          keywords: [...genres, ...languages],
          canonical: `/series/${seriesSlug}/season/${episodeInfo.seasonNumber}/episode/${episodeInfo.episodeNumber}`,
        }),
      },
    })
    await createImportJobItem(ctx.jobId, item, "imported", `episode ${episode.id}`, undefined, episode.id)
    await logAudit({
      actor: ctx.requestedBy || "system",
      action: published ? "content.published" : "content.imported",
      targetType: "episode",
      target: episode.id,
      detail: { seriesId: series.id, episodeNumber: episode.episodeNumber, decision },
      ip: ctx.ip,
      jobId: ctx.jobId,
      episodeId: episode.id,
    })
    return { saved: true, published, reviewRequired: !published, episodeId: episode.id, reason: `imported episode ${episode.id}` }
  }

  // Standalone content (movie/documentary/short/animation/other)
  const slug = await uniqueSlug(slugify(item.title))
  const content = await db.content.create({
    data: {
      title: item.title,
      slug,
      type: contentType as any,
      description: item.description,
      poster: item.thumbnail,
      backdrop: item.thumbnail,
      releaseYear: year,
      duration: item.duration,
      genres: jsonStringify(genres),
      languages: jsonStringify(languages),
      published,
      sourceProvider: item.sourceProvider,
      sourceId: item.sourceId,
      originalUrl: item.originalUrl,
      embedUrl: item.embedUrl,
      streamUrl: item.streamUrl,
      licenseType: decision.type,
      licenseVerified: decision.verified,
      licenseAttribution: decision.attribution,
      licenseSourceUrl: decision.sourceUrl,
      licenseStatus: decision.status,
      licenseCheckedAt: new Date(),
      sourcePopularity: item.viewCount || 0,
      seoJson: buildSeo({
        title: item.title,
        description: item.description,
        keywords: [...genres, ...languages],
        canonical: `/movie/${slug}`,
      }),
    },
  })

  // Update trending score
  await updateTrendingScore(content.id)

  await createImportJobItem(ctx.jobId, item, "imported", `content ${content.id}`, content.id)
  await logAudit({
    actor: ctx.requestedBy || "system",
    action: published ? "content.published" : "content.imported",
    targetType: "content",
    target: content.id,
    detail: { type: contentType, decision },
    ip: ctx.ip,
    jobId: ctx.jobId,
    contentId: content.id,
  })

  return {
    saved: true,
    published,
    reviewRequired: !published,
    contentId: content.id,
    reason: `imported content ${content.id} (${decision.status})`,
  }
}

// =========================================================
// HELPERS
// =========================================================

async function getQueriesForJob(opts: ImportOptions): Promise<string[]> {
  // If we have a query string, use that; otherwise sample enabled SourceQueries for source.
  // (For URL imports we call importByUrl, not importSearch.)
  // Get up to 3 queries from the library.
  const queries = await db.sourceQuery.findMany({
    where: { source: opts.source, enabled: true },
    take: 3,
    orderBy: { useCount: "asc" },
  })
  if (queries.length === 0) {
    return opts.source === "youtube"
      ? ["public domain full movies", "creative commons documentary"]
      : ["public domain film", "classic cinema animation"]
  }
  return queries.map(q => q.query)
}

export async function findDuplicate(opts: {
  sourceProvider: string
  sourceId: string
  title: string
  year?: number | null
}): Promise<{ id: string } | null> {
  // 1. By source ID
  const bySource = await db.content.findFirst({
    where: { sourceProvider: opts.sourceProvider, sourceId: opts.sourceId },
    select: { id: true },
  })
  if (bySource) return bySource
  // 2. Episode by source
  const byEpSource = await db.episode.findFirst({
    where: { sourceProvider: opts.sourceProvider, sourceId: opts.sourceId },
    select: { id: true },
  })
  if (byEpSource) return byEpSource
  // 3. Normalized title + year (loose)
  const normalized = normalizeTitle(opts.title)
  if (normalized.length < 6) return null
  const candidates = await db.content.findMany({
    where: { title: { contains: opts.title.slice(0, 30) } },
    take: 20,
  })
  for (const c of candidates) {
    if (normalizeTitle(c.title) === normalized) {
      if (!opts.year || !c.releaseYear || c.releaseYear === opts.year) return { id: c.id }
    }
  }
  return null
}

async function findOrCreateSeries(opts: {
  title: string
  slug: string
  description: string
  poster: string | null
  backdrop: string | null
  genres: string[]
  languages: string[]
  sourceProvider: string
  sourceChannel?: string
  published: boolean
}) {
  const existing = await db.series.findUnique({ where: { slug: opts.slug } })
  if (existing) {
    // Promote to published if this episode is verified and series not yet published
    if (opts.published && !existing.published) {
      return db.series.update({ where: { id: existing.id }, data: { published: true } })
    }
    return existing
  }
  return db.series.create({
    data: {
      title: opts.title,
      slug: opts.slug,
      description: opts.description,
      poster: opts.poster,
      backdrop: opts.backdrop,
      genres: jsonStringify(opts.genres),
      languages: jsonStringify(opts.languages),
      sourceProvider: opts.sourceProvider,
      sourceChannel: opts.sourceChannel,
      published: opts.published,
      seoJson: buildSeo({
        title: opts.title,
        description: opts.description,
        keywords: [...opts.genres, ...opts.languages],
        canonical: `/series/${opts.slug}`,
      }),
    },
  })
}

async function findOrCreateSeason(seriesId: string, seasonNumber: number) {
  const existing = await db.season.findUnique({
    where: { seriesId_seasonNumber: { seriesId, seasonNumber } },
  })
  if (existing) return existing
  return db.season.create({
    data: { seriesId, seasonNumber, title: `Season ${seasonNumber}` },
  })
}

async function uniqueSlug(base: string): Promise<string> {
  if (!base) base = "untitled"
  let candidate = base
  let n = 1
  while (await db.content.findUnique({ where: { slug: candidate } })) {
    candidate = `${base}-${++n}`
  }
  return candidate
}

function detectSourceFromUrl(url: string): "youtube" | "wikimedia" | "direct" {
  if (/youtube\.com|youtu\.be/i.test(url)) return "youtube"
  if (/commons\.wikimedia\.org/i.test(url)) return "wikimedia"
  return "direct"
}

async function createImportJobItem(
  jobId: string | undefined,
  item: DiscoveredItem,
  status: string,
  reason: string,
  contentId?: string,
  episodeId?: string,
) {
  if (!jobId) return
  try {
    await db.importJobItem.create({
      data: {
        jobId,
        sourceId: item.sourceId,
        sourceProvider: item.sourceProvider,
        title: item.title,
        status,
        reason,
        contentId,
        episodeId,
      },
    })
  } catch {}
}

async function logAudit(opts: {
  actor: string
  action: string
  targetType?: string
  target?: string | null
  detail?: any
  ip?: string
  jobId?: string
  contentId?: string
  episodeId?: string
}) {
  try {
    await db.auditLog.create({
      data: {
        actor: opts.actor,
        action: opts.action,
        targetType: opts.targetType,
        target: opts.target || null,
        detail: jsonStringify(opts.detail || {}),
        ip: opts.ip,
        jobId: opts.jobId,
        contentId: opts.contentId,
        episodeId: opts.episodeId,
      },
    })
  } catch {}
}

// Trending score: weighted blend of internal engagement + source popularity.
// New imports get a small baseline so they appear in trending feeds.
export async function updateTrendingScore(contentId: string): Promise<void> {
  const c = await db.content.findUnique({ where: { id: contentId } })
  if (!c) return
  const ageDays = (Date.now() - c.importedAt.getTime()) / (1000 * 60 * 60 * 24)
  const freshness = Math.max(0, 10 - ageDays) // up to 10-point boost for first 10 days
  const score =
    c.plays * 1 +
    c.completions * 5 +
    c.favorites * 3 +
    c.likes * 2 +
    Math.log10(Math.max(c.views + 1, 1)) +
    Math.log10(Math.max(c.sourcePopularity + 1, 1)) * 0.5 +
    freshness
  await db.content.update({
    where: { id: contentId },
    data: { trendingScore: Math.round(score) },
  })
}

export async function updateSeriesTrendingScore(seriesId: string): Promise<void> {
  const eps = await db.episode.findMany({
    where: { seriesId },
    select: { plays: true, completions: true },
  })
  const plays = eps.reduce((s, e) => s + e.plays, 0)
  const completions = eps.reduce((s, e) => s + e.completions, 0)
  const score = plays + completions * 5
  await db.series.update({ where: { id: seriesId }, data: { trendingScore: Math.round(score) } })
}
