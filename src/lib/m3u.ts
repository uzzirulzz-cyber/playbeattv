// M3U parser + builder for IPTV playlists.
// Supports M3U and M3U8 (they're the same format; .m3u8 just signals UTF-8).
//
// Format reference: https://en.wikipedia.org/wiki/M3U
// Xtream-style extensions we honor:
//   tvg-id, tvg-name, tvg-logo, group-title
// Plus #EXTGRP: (separate line) and #EXTVLCOPT (ignored).

export interface ParsedChannel {
  name: string
  streamUrl: string
  category?: string
  logoUrl?: string
  tvgId?: string
  tvgName?: string
  metadata?: Record<string, string> // any extra attrs that don't fit the standard fields
}

// Parse an M3U/M3U8 playlist text into a list of channels.
// Tolerant of #EXTM3U header, mixed CRLF/LF, missing fields.
export function parseM3u(text: string): ParsedChannel[] {
  const lines = text.split(/\r?\n/).map(l => l.trim())
  const out: ParsedChannel[] = []
  let cur: Partial<ParsedChannel> & { metadata?: Record<string, string> } = {}

  for (const line of lines) {
    if (!line) continue
    if (line.startsWith("#EXTM3U")) continue // header
    if (line.startsWith("#EXTINF")) {
      // #EXTINF:<duration> <attrs>,<display name>
      // attrs are k="v" pairs separated by spaces
      const commaIdx = line.indexOf(",")
      const name = commaIdx >= 0 ? line.slice(commaIdx + 1).trim() : "Untitled"
      const attrsPart = commaIdx >= 0 ? line.slice("#EXTINF:".length, commaIdx) : ""
      cur.name = name
      // Parse attrs (skip the leading duration number)
      const attrMatches = attrsPart.matchAll(/([a-zA-Z0-9_-]+)="([^"]*)"/g)
      for (const m of attrMatches) {
        const k = m[1].toLowerCase()
        const v = m[2]
        switch (k) {
          case "tvg-id":       cur.tvgId = v; break
          case "tvg-name":     cur.tvgName = v; break
          case "tvg-logo":     cur.logoUrl = v; break
          case "group-title":  cur.category = v; break
          default:
            cur.metadata = cur.metadata || {}
            cur.metadata[k] = v
        }
      }
    } else if (line.startsWith("#EXTGRP:")) {
      cur.category = line.slice("#EXTGRP:".length).trim()
    } else if (line.startsWith("#EXTVLCOPT:")) {
      // ignore — VLC-specific option
    } else if (line.startsWith("#")) {
      // ignore unknown tags
    } else {
      // URL line — this completes the current entry
      if (cur.name) {
        cur.streamUrl = line
        out.push({
          name: cur.name,
          streamUrl: cur.streamUrl,
          category: cur.category || undefined,
          logoUrl: cur.logoUrl || undefined,
          tvgId: cur.tvgId || undefined,
          tvgName: cur.tvgName || undefined,
          metadata: cur.metadata || undefined,
        })
      }
      cur = {}
    }
  }
  return out
}

// Build an M3U playlist text from a list of channels.
// Output is valid M3U8 (UTF-8) with Xtream-style attrs.
export function buildM3u(opts: {
  channels: Array<{
    name: string
    streamUrl: string
    category?: string | null
    logoUrl?: string | null
    tvgId?: string | null
    tvgName?: string | null
    metadata?: string | null // JSON string from DB
  }>
  playlistEpgUrl?: string | null
  playlistName?: string
}): string {
  const lines: string[] = []
  // Header
  let header = "#EXTM3U"
  if (opts.playlistEpgUrl) {
    header += ` url="${opts.playlistEpgUrl}"`
  }
  lines.push(header)

  for (const c of opts.channels) {
    const attrs: string[] = []
    if (c.tvgId)       attrs.push(`tvg-id="${c.tvgId}"`)
    if (c.tvgName)     attrs.push(`tvg-name="${c.tvgName}"`)
    if (c.logoUrl)     attrs.push(`tvg-logo="${c.logoUrl}"`)
    if (c.category)    attrs.push(`group-title="${c.category}"`)
    // Inline any extra metadata from the JSON column
    if (c.metadata) {
      try {
        const extra = JSON.parse(c.metadata) as Record<string, string>
        for (const [k, v] of Object.entries(extra)) {
          // Skip ones we already wrote above
          if (!["tvg-id", "tvg-name", "tvg-logo", "group-title"].includes(k.toLowerCase())) {
            attrs.push(`${k}="${v.replace(/"/g, "\\\"")}"`)
          }
        }
      } catch {}
    }
    const attrStr = attrs.length > 0 ? " " + attrs.join(" ") : ""
    lines.push(`#EXTINF:-1${attrStr},${c.name}`)
    if (c.category && !attrs.some(a => a.startsWith("group-title="))) {
      // Defensive: write #EXTGRP too if group-title wasn't used
      lines.push(`#EXTGRP:${c.category}`)
    }
    lines.push(c.streamUrl)
  }
  return lines.join("\n") + "\n"
}

// Helper: validate a URL is plausibly a stream URL.
// Not strict — just catches obvious typos like missing protocol.
export function isValidStreamUrl(url: string): boolean {
  if (!url) return false
  if (!/^https?:\/\//i.test(url) && !/^rtmp:\/\//i.test(url) && !/^rtsp:\/\//i.test(url)) {
    return false
  }
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

// Helper: derive a safe filename from a playlist name.
export function safeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "playlist"
}

// Helper: fetch an M3U from a URL (server-side only).
export async function fetchM3uFromUrl(url: string): Promise<{ text: string; ok: boolean; error?: string }> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(20000),
      headers: { "User-Agent": "PlayBeatTV-M3U-Importer/1.0" },
      redirect: "follow",
    })
    if (!res.ok) return { text: "", ok: false, error: `HTTP ${res.status}` }
    const text = await res.text()
    return { text, ok: true }
  } catch (e: any) {
    return { text: "", ok: false, error: e.message || String(e) }
  }
}
