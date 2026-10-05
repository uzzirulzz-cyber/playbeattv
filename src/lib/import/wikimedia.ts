// Wikimedia Commons importer — REAL API calls (no key needed).
// Uses the MediaWiki Action API + the Commons search API.

import { verifyWikimediaLicense, type LicenseDecision } from "./license"

const COMMONS_API = "https://commons.wikimedia.org/w/api.php"
const COMMONS_FILE_PAGE = (file: string) =>
  `https://commons.wikimedia.org/wiki/${encodeURIComponent(file)}`

export interface WikimediaVideoResult {
  title: string          // File:Foo.mp4
  description: string
  fileUrl: string        // direct video URL
  poster: string | null
  artist: string
  licenseShortName: string
  licenseUrl: string | null
  sourceUrl: string      // Commons file page
  durationSec: number | null
  categories: string[]
  uploadedAt: string | null
}

export interface WikimediaSearchOptions {
  query: string
  maxResults?: number
}

export interface WikimediaSearchResponse {
  items: WikimediaVideoResult[]
  errors: string[]
}

// Step 1: search Commons for video files matching the query
export async function searchVideos(opts: WikimediaSearchOptions): Promise<WikimediaSearchResponse> {
  const max = Math.min(opts.maxResults || 25, 50)
  // Use generator=search with namespace=6 (File:)
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    generator: "search",
    gsrsearch: `${opts.query} filetype:video`,
    gsrnamespace: "6",
    gsrlimit: String(max),
    prop: "videoinfo|imageinfo",
    viprop: "mediatype|metadata|url|mime|size|thumbmime",
    iiprop: "url|extmetadata|size|mime|mediatype|metadata",
    iiurlwidth: "640",
    origin: "*",
  })
  const url = `${COMMONS_API}?${params.toString()}`
  let res: Response
  try {
    res = await fetch(url, { headers: { "User-Agent": "PlayBeatTV/1.0 (contact@playbeattv.buzz)" } })
  } catch (e: any) {
    return { items: [], errors: [`network: ${e.message || String(e)}`] }
  }
  if (!res.ok) {
    return { items: [], errors: [`HTTP ${res.status}`] }
  }
  const data = await res.json()
  const pages = data?.query?.pages
  if (!pages) return { items: [], errors: [] }
  const list: any[] = Object.values(pages)
  const items: WikimediaVideoResult[] = []
  const errors: string[] = []

  for (const page of list) {
    try {
      // IMPORTANT: videoinfo returns video-specific fields (duration, mime, derivatives)
      // but does NOT return extmetadata. imageinfo returns extmetadata (license, artist, etc.)
      // but no duration. We must merge both.
      const vi = page.videoinfo?.[0] || {}
      const ii = page.imageinfo?.[0] || {}
      const info = { ...ii, ...vi }
      if (!info.mime || !info.mime.startsWith("video/")) continue

      const ext = ii.extmetadata || {}
      const licenseShortName = ext.LicenseShortName?.value || ext.License?.value || ""
      const licenseUrl = ext.LicenseUrl?.value || null
      const artistRaw = ext.Artist?.value || ""
      const artist = stripHtml(artistRaw) || "Unknown"
      const descriptionRaw = ext.ImageDescription?.value || page.title || ""
      const description = stripHtml(descriptionRaw)
      const durationSec = parseDurationFromMetadata(vi.metadata) || vi.duration || null

      items.push({
        title: page.title,
        description,
        fileUrl: (vi.url || ii.url || "").split("?")[0], // strip utm params
        poster: ii.thumburl || vi.thumburl || null,
        artist,
        licenseShortName,
        licenseUrl,
        sourceUrl: COMMONS_FILE_PAGE(page.title),
        durationSec,
        categories: [],
        uploadedAt: ii.timestamp || vi.timestamp || null,
      })
    } catch (e: any) {
      errors.push(`page ${page?.title}: ${e.message || String(e)}`)
    }
  }
  return { items, errors }
}

// Look up license detail for a single file
export async function fetchFileInfo(fileName: string): Promise<WikimediaVideoResult | null> {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    titles: fileName.startsWith("File:") ? fileName : `File:${fileName}`,
    prop: "videoinfo|imageinfo",
    viprop: "mediatype|metadata|url|mime|size|thumbmime",
    iiprop: "url|extmetadata|size|mime|mediatype|metadata",
    iiurlwidth: "1280",
    origin: "*",
  })
  const url = `${COMMONS_API}?${params.toString()}`
  const res = await fetch(url, { headers: { "User-Agent": "PlayBeatTV/1.0 (contact@playbeattv.buzz)" } })
  if (!res.ok) return null
  const data = await res.json()
  const pages = data?.query?.pages
  if (!pages) return null
  const page: any = Object.values(pages)[0]
  if (!page) return null
  const vi = page.videoinfo?.[0] || {}
  const ii = page.imageinfo?.[0] || {}
  const info = { ...ii, ...vi }
  if (!info.mime || !info.mime.startsWith("video/")) return null
  const ext = ii.extmetadata || {}
  return {
    title: page.title,
    description: stripHtml(ext.ImageDescription?.value || page.title),
    fileUrl: (vi.url || ii.url || "").split("?")[0],
    poster: ii.thumburl || vi.thumburl || null,
    artist: stripHtml(ext.Artist?.value || "") || "Unknown",
    licenseShortName: ext.LicenseShortName?.value || ext.License?.value || "",
    licenseUrl: ext.LicenseUrl?.value || null,
    sourceUrl: COMMONS_FILE_PAGE(page.title),
    durationSec: parseDurationFromMetadata(vi.metadata) || vi.duration || null,
    categories: [],
    uploadedAt: ii.timestamp || vi.timestamp || null,
  }
}

// Resolve the actual playable URL for a Commons file (transcoded if needed)
export async function resolvePlayableUrl(fileName: string): Promise<{
  original: string
  transcoded?: string
  poster?: string | null
} | null> {
  // Try the transcoding API for mp4 fallback
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    titles: fileName.startsWith("File:") ? fileName : `File:${fileName}`,
    prop: "imageinfo|videoinfo",
    iiprop: "url|mime|size",
    viprop: "url|derivatives",
    iiurlwidth: "1280",
    origin: "*",
  })
  const res = await fetch(`${COMMONS_API}?${params.toString()}`, {
    headers: { "User-Agent": "PlayBeatTV/1.0 (contact@playbeattv.buzz)" }
  })
  if (!res.ok) return null
  const data = await res.json()
  const pages = data?.query?.pages
  if (!pages) return null
  const page: any = Object.values(pages)[0]
  if (!page) return null
  const info = page.videoinfo?.[0] || page.imageinfo?.[0]
  if (!info) return null
  let transcoded: string | undefined
  for (const d of info.derivatives || []) {
    if (d.transcodedkey?.includes("720p.vp9.webm") || d.transcodedkey?.includes("720p.mp4")) {
      transcoded = d.transcodedurl
      break
    }
  }
  if (!transcoded && (info.derivatives || []).length > 0) {
    transcoded = info.derivatives[0].transcodedurl
  }
  return {
    original: info.url || "",
    transcoded,
    poster: info.thumburl || null,
  }
}

// Helpers
function stripHtml(html: string): string {
  if (!html) return ""
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim()
}

function parseDurationFromMetadata(metadata: any): number | null {
  if (!Array.isArray(metadata)) return null
  for (const m of metadata) {
    if (m.name === "length" || m.name === "duration") {
      const v = parseFloat(m.value)
      if (!Number.isNaN(v)) return Math.round(v)
    }
  }
  return null
}

export function verifyLicense(item: WikimediaVideoResult): LicenseDecision {
  return verifyWikimediaLicense({
    licenseShortName: item.licenseShortName,
    licenseUrl: item.licenseUrl || undefined,
    artist: item.artist,
    sourceUrl: item.sourceUrl,
    title: item.title,
  })
}
