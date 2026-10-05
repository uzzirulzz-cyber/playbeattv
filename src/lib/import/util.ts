// Utilities: slug, SEO, JSON helpers, duration parsing, normalization.

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 80)
}

export function parseIsoDurationToSeconds(iso: string | undefined | null): number | null {
  if (!iso) return null
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso)
  if (!m) return null
  const h = parseInt(m[1] || "0", 10)
  const min = parseInt(m[2] || "0", 10)
  const s = parseInt(m[3] || "0", 10)
  return h * 3600 + min * 60 + s
}

export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/\[.*?\]/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function extractYear(text: string): number | null {
  const m = /\b(19\d{2}|20\d{2})\b/.exec(text)
  return m ? parseInt(m[1], 10) : null
}

export function jsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function jsonStringify(value: unknown): string {
  try {
    return JSON.stringify(value)
  } catch {
    return "{}"
  }
}

export function buildSeo(opts: {
  title: string
  description: string
  keywords?: string[]
  canonical: string
}): string {
  return jsonStringify({
    title: opts.title.slice(0, 70),
    description: opts.description.slice(0, 160),
    keywords: (opts.keywords || []).slice(0, 12),
    canonical: opts.canonical,
  })
}

// Breadcrumb + schema.org helpers
export function movieSchema(opts: {
  title: string
  description: string
  poster?: string | null
  duration?: number | null
  year?: number | null
  canonical: string
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Movie",
    name: opts.title,
    description: opts.description,
    thumbnailUrl: opts.poster || undefined,
    uploadDate: opts.year ? `${opts.year}-01-01` : undefined,
    contentUrl: opts.canonical,
    duration: opts.duration ? `PT${Math.round(opts.duration / 60)}M` : undefined,
  }
}

export function videoObjectSchema(opts: {
  title: string
  description: string
  thumbnail?: string | null
  uploadDate?: string
  contentUrl: string
  embedUrl?: string
  duration?: number | null
}) {
  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: opts.title,
    description: opts.description,
    thumbnailUrl: opts.thumbnail || undefined,
    uploadDate: opts.uploadDate,
    contentUrl: opts.contentUrl,
    embedUrl: opts.embedUrl,
    duration: opts.duration ? `PT${Math.round(opts.duration / 60)}M` : undefined,
  }
}

export function tvSeriesSchema(opts: {
  title: string
  description: string
  canonical: string
  seasonsCount: number
}) {
  return {
    "@context": "https://schema.org",
    "@type": "TVSeries",
    name: opts.title,
    description: opts.description,
    url: opts.canonical,
    numberOfSeasons: opts.seasonsCount,
  }
}

export function breadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  }
}

export function safeHost(url: string): string | null {
  try {
    return new URL(url).host
  } catch {
    return null
  }
}
