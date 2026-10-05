// Unified discovery adapter — wraps YouTube + Wikimedia into a single shape
// so the engine doesn't care which source it's dealing with.

import { searchVideos as ytSearch, fetchVideoMeta, youtubeEmbedUrl, youtubeWatchUrl, isYouTubeConfigured } from "./youtube"
import { searchVideos as wmSearch, fetchFileInfo, verifyLicense as wmVerify, resolvePlayableUrl } from "./wikimedia"
import { verifyYouTubeLicense, verifyWikimediaLicense, type LicenseDecision } from "./license"
import { extractYear } from "./util"

export interface DiscoveredItem {
  sourceProvider: "youtube" | "wikimedia" | "direct"
  sourceId: string                 // YouTube videoId / Wikimedia file name / direct URL
  title: string
  description: string
  thumbnail: string | null
  duration: number | null          // seconds
  tags: string[]
  channelTitle?: string            // YouTube
  channelId?: string
  year?: number | null
  viewCount?: number
  likeCount?: number
  metadataLanguage?: string
  originalUrl: string | null
  embedUrl: string | null
  streamUrl: string | null
  licenseDecision: LicenseDecision
  antiMoviePattern: boolean
  isShort: boolean
}

// =========================================================
// YOUTUBE
// =========================================================

export async function searchYouTubeVideos(opts: {
  query: string
  maxResults?: number
  licenseFilter?: string
  ids?: string[]
}): Promise<DiscoveredItem[]> {
  if (!isYouTubeConfigured()) return []
  let searchItems
  if (opts.ids && opts.ids.length > 0) {
    // Direct ID lookup
    const metas = await fetchVideoMeta(opts.ids)
    return metas.map(metaToDiscovered)
  }
  if (opts.maxResults === 0 && opts.query === "") return []
  const license = opts.licenseFilter === "creative_commons"
    ? "creativeCommon"
    : opts.licenseFilter === "public_domain"
    ? "any"  // YouTube API doesn't expose PD filter — rely on text + later verification
    : "any"
  searchItems = await ytSearch({
    query: opts.query,
    maxResults: opts.maxResults || 25,
    videoLicense: license as any,
    embeddableOnly: true,
  })
  if (searchItems.items.length === 0) return []
  const metas = await fetchVideoMeta(searchItems.items.map(i => i.videoId))
  return metas.map(metaToDiscovered)
}

function metaToDiscovered(m: any): DiscoveredItem {
  const decision = verifyYouTubeLicense({
    license: m.license,
    channelId: m.channelId,
    channelTitle: m.channelTitle,
    title: m.title,
    description: m.description,
    sourceUrl: youtubeWatchUrl(m.videoId),
    isOfficialChannel: isLikelyOfficialChannel(m.channelTitle, m.description),
  })
  const antiMoviePattern = isAntiMovie(m.title, m.description)
  return {
    sourceProvider: "youtube",
    sourceId: m.videoId,
    title: m.title,
    description: m.description,
    thumbnail: m.thumbnail,
    duration: m.duration,
    tags: m.tags || [],
    channelTitle: m.channelTitle,
    channelId: m.channelId,
    year: extractYear(`${m.title} ${m.description} ${m.publishedAt}`),
    viewCount: m.viewCount,
    likeCount: m.likeCount,
    metadataLanguage: m.defaultAudioLanguage || m.defaultLanguage,
    originalUrl: youtubeWatchUrl(m.videoId),
    embedUrl: youtubeEmbedUrl(m.videoId),
    streamUrl: null,
    licenseDecision: decision,
    antiMoviePattern,
    isShort: false,
  }
}

function isLikelyOfficialChannel(channelTitle: string | undefined, description: string | undefined): boolean {
  // Heuristic: channel name or description contains "official"
  const text = `${channelTitle || ""}\n${description || ""}`
  return /\bofficial\b/i.test(text)
}

function isAntiMovie(title: string, description: string): boolean {
  const text = `${title}\n${description}`
  const re = [
    /\btrailer\b/i,
    /\bteaser\b/i,
    /\breaction\b/i,
    /\breview\b/i,
    /\bfan\s*(?:edit|made|dub|cut)\b/i,
    /\bscreen\s*record/i,
    /\bcam\s*rip\b/i,
    /\bclip\s*\d/i,
  ]
  return re.some(r => r.test(text))
}

// =========================================================
// WIKIMEDIA COMMONS
// =========================================================

export async function searchWikimediaVideos(opts: {
  query: string
  maxResults?: number
  fileName?: string
}): Promise<DiscoveredItem[]> {
  if (opts.fileName) {
    const item = await fetchFileInfo(opts.fileName)
    if (!item) return []
    return [wmItemToDiscovered(item)]
  }
  if (opts.maxResults === 0 && opts.query === "") return []
  const result = await wmSearch({ query: opts.query, maxResults: opts.maxResults || 25 })
  return result.items.map(wmItemToDiscovered)
}

function wmItemToDiscovered(item: any): DiscoveredItem {
  const decision = verifyWikimediaLicense({
    licenseShortName: item.licenseShortName,
    licenseUrl: item.licenseUrl || undefined,
    artist: item.artist,
    sourceUrl: item.sourceUrl,
    title: item.title,
  })
  const cleanTitle = item.title.replace(/^File:/, "").replace(/\.(webm|mp4|ogv|ogg)$/i, "").replace(/_/g, " ")
  return {
    sourceProvider: "wikimedia",
    sourceId: item.title,
    title: cleanTitle,
    description: item.description || cleanTitle,
    thumbnail: item.poster,
    duration: item.durationSec,
    tags: [],
    channelTitle: item.artist,
    year: extractYear(item.uploadedAt || "") || extractYear(cleanTitle),
    viewCount: 0,
    likeCount: 0,
    metadataLanguage: undefined,
    originalUrl: item.sourceUrl,
    embedUrl: null,
    streamUrl: item.fileUrl,
    licenseDecision: decision,
    antiMoviePattern: false,
    isShort: item.durationSec != null && item.durationSec < 10 * 60,
  }
}
