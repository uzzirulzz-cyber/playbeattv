// Episode / season / movie detection — pure regex, no ML.
// Inputs: title + (optional) description + duration + tags.

export interface EpisodeMatch {
  isEpisode: boolean
  seriesTitle: string
  seasonNumber: number
  episodeNumber: number
  episodeTitle?: string
}

const SEASON_EP_PATTERNS: RegExp[] = [
  // S01E05 / s1e5 / S01E05
  /\bs?(\d{1,2})\s*e(\d{1,3})\b/i,
  // Season 1 Episode 5
  /\bseason\s+(\d{1,2})\s+episode\s+(\d{1,3})\b/i,
  // Season 1 - Episode 5
  /\bseason\s+(\d{1,2})\b[^a-z0-9]*episode\s+(\d{1,3})\b/i,
  // EP05 / EP 05 / EP-05 / E05 (only when followed by a digit)
  /\bep(?:isode)?\s*[-:#.]?\s*(\d{1,3})\b/i,
]

// Patterns that explicitly say "this is episode N" without season
const EPISODE_ONLY = /\bep(?:isode)?\s*[-:#.]?\s*(\d{1,3})\b/i

// Patterns that explicitly say "season N" or "season N part M"
const SEASON_ONLY = /\bseason\s+(\d{1,2})\b/i

// Part / Chapter / Pt — also episodic markers
const PART_PATTERNS: RegExp[] = [
  /\bpart\s+(\d{1,3})\b/i,
  /\bpt\.?\s*(\d{1,3})\b/i,
  /\bchapter\s+(\d{1,3})\b/i,
]

export function detectEpisode(rawTitle: string): EpisodeMatch {
  const title = rawTitle.trim()
  // Try SxxExx / Season x Episode y / EP##
  for (const re of SEASON_EP_PATTERNS) {
    const m = title.match(re)
    if (m && m.length >= 3) {
      const s = parseInt(m[1], 10)
      const e = parseInt(m[2], 10)
      const seriesTitle = stripEpisodeMarkers(title).trim() || title
      return { isEpisode: true, seriesTitle, seasonNumber: s || 1, episodeNumber: e }
    }
  }
  // Season 1 / Part 4 standalone — we'll need both for an episode match
  const seasonM = title.match(SEASON_ONLY)
  for (const re of PART_PATTERNS) {
    const m = title.match(re)
    if (m) {
      const part = parseInt(m[1], 10)
      const seriesTitle = stripEpisodeMarkers(title).trim() || title
      return {
        isEpisode: true,
        seriesTitle,
        seasonNumber: seasonM ? parseInt(seasonM[1], 10) : 1,
        episodeNumber: part,
      }
    }
  }
  // Episode only — assume season 1
  const epOnly = title.match(EPISODE_ONLY)
  if (epOnly) {
    const e = parseInt(epOnly[1], 10)
    const seriesTitle = stripEpisodeMarkers(title).trim() || title
    return { isEpisode: true, seriesTitle, seasonNumber: 1, episodeNumber: e }
  }
  return { isEpisode: false, seriesTitle: title, seasonNumber: 0, episodeNumber: 0 }
}

function stripEpisodeMarkers(title: string): string {
  return title
    .replace(/\bseason\s+\d{1,2}\s*[-:]?\s*episode\s+\d{1,3}\b.*$/i, "")
    .replace(/\bs?\d{1,2}\s*e\d{1,3}\b.*$/i, "")
    .replace(/\bseason\s+\d{1,2}\b.*$/i, "")
    .replace(/\bep(?:isode)?\s*[-:#.]?\s*\d{1,3}\b.*$/i, "")
    .replace(/\bpart\s+\d{1,3}\b.*$/i, "")
    .replace(/\bpt\.?\s*\d{1,3}\b.*$/i, "")
    .replace(/\bchapter\s+\d{1,3}\b.*$/i, "")
    .replace(/\s*[-:|]\s*$/, "")
    .replace(/\s*\(.*?\)\s*$/, "")
    .trim()
}

export interface MovieSignals {
  isMovie: boolean
  reasons: string[]
}

const MOVIE_TITLE_PATTERNS: RegExp[] = [
  /\bfull\s+movie\b/i,
  /\bfull\s+film\b/i,
  /\bcomplete\s+film\b/i,
  /\bcomplete\s+movie\b/i,
  /\bmovies?\s*\(?\d{4}\)?/i,
  /\bfilm\s*\(?\d{4}\)?/i,
]

const MOVIE_DESC_PATTERNS: RegExp[] = [
  /\b(full\s+(?:movie|film))\b/i,
  /\bdirected\s+by\b/i,
  /\bstarring\b/i,
  /\bcast\s*:/i,
  /\bruntime\b/i,
]

const NOT_MOVIE_PATTERNS: RegExp[] = [
  /\btrailer\b/i,
  /\bteaser\b/i,
  /\bclip\b/i,
  /\breaction\b/i,
  /\breview\b/i,
  /\bfan\s*(?:edit|made|dub|cut)\b/i,
  /\bcam\s*rip\b/i,
  /\bscreen\s*record/i,
  /\bepisode\s+\d/i,
]

export function detectMovie(opts: {
  title: string
  description?: string
  duration?: number | null
  tags?: string[]
  category?: string
}): MovieSignals {
  const reasons: string[] = []
  const text = `${opts.title}\n${opts.description || ""}`

  // Negative signals first
  if (NOT_MOVIE_PATTERNS.some(re => re.test(opts.title))) {
    return { isMovie: false, reasons: ["title matches anti-movie pattern"] }
  }

  // Duration > ~40 min suggests a feature film
  if (opts.duration && opts.duration >= 40 * 60) {
    reasons.push(`duration ${Math.round(opts.duration / 60)}min ≥ 40min`)
  }

  // Title patterns
  if (MOVIE_TITLE_PATTERNS.some(re => re.test(opts.title))) {
    reasons.push("title contains movie marker")
  }
  // Description patterns
  if (MOVIE_DESC_PATTERNS.some(re => re.test(text))) {
    reasons.push("description contains film marker")
  }
  // Category
  if (opts.category && /film|movie|cinema/i.test(opts.category)) {
    reasons.push("category indicates cinema")
  }
  // Tags
  if (opts.tags && opts.tags.some(t => /\b(full\s*movie|film|cinema|classic)\b/i.test(t))) {
    reasons.push("tag indicates film")
  }

  return { isMovie: reasons.length > 0, reasons }
}

// "short" film signal — under a configured min but tagged short, or title says short
export function detectShort(opts: {
  title: string
  description?: string
  duration?: number | null
  tags?: string[]
  maxShortDurationSec?: number
}): boolean {
  const maxShort = opts.maxShortDurationSec || 40 * 60
  if (/\bshort\s*(film|movie|animation)?\b/i.test(opts.title) ||
      /\bshort\s*(film|movie|animation)?\b/i.test(opts.description || "")) {
    if (!opts.duration || opts.duration <= maxShort) return true
  }
  if (opts.duration && opts.duration <= 10 * 60) {
    // 10 min or less almost always a short
    return true
  }
  if (opts.tags && opts.tags.some(t => /\bshort\b/i.test(t))) return true
  return false
}
