"use client"

import { useEffect, useRef, useState } from "react"
import { AlertCircle } from "lucide-react"
import { useApp } from "@/stores/app"

export interface PlayerProps {
  sourceProvider: string
  sourceId?: string
  originalUrl?: string | null
  embedUrl?: string | null
  streamUrl?: string | null
  poster?: string | null
  title: string
  durationSec?: number | null
  contentId?: string
  episodeId?: string
  seriesId?: string
}

// Unified player adapter — picks the right player based on source provider.
// Sends watch-progress updates every 15s to /api/watch-progress.
export function PlayerAdapter(props: PlayerProps) {
  const { sourceProvider, embedUrl, streamUrl, poster, title, durationSec, contentId, episodeId, seriesId } = props
  const userId = useApp(s => s.ensureUserId())
  const [position, setPosition] = useState(0)
  const [duration, setDuration] = useState(durationSec || 0)
  const [ready, setReady] = useState(false)
  const lastReport = useRef(0)

  // Report watch progress
  useEffect(() => {
    if (!position || position < 1) return
    const now = Date.now()
    if (now - lastReport.current < 15000) return
    lastReport.current = now
    fetch("/api/watch-progress", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-pb-user": userId },
      body: JSON.stringify({
        contentId, episodeId, seriesId,
        position, duration,
      }),
    }).catch(() => {})
  }, [position, duration, contentId, episodeId, seriesId, userId])

  // For non-YouTube players, we can read video element time
  // For YouTube, we'd need the iframe API; for v1 we just report approximate progress

  // ============== YOUTUBE ==============
  if (sourceProvider === "youtube" && embedUrl) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
        <iframe
          src={`${embedUrl}?autoplay=1&modestbranding=1&rel=0&enablejsapi=1`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
        />
      </div>
    )
  }

  // ============== WIKIMEDIA / DIRECT MP4 / WEBM ==============
  // ============== WIKIMEDIA / DIRECT MP4 / WEBM ==============
  // Wikimedia files are typically .webm — play natively.
  // For .m3u8/.mpd we'd need hls.js/dash.js — handle in next iteration
  const videoUrl = streamUrl || embedUrl
  // Route HTTP direct-stream URLs through our proxy when the page is served
  // over HTTPS (mixed-content protection).
  const safeDirectUrl = (() => {
    if (!videoUrl) return videoUrl
    if (typeof window !== "undefined" && window.location.protocol === "https:" && /^http:\/\//.test(videoUrl)) {
      return proxifyUrl(videoUrl)
    }
    return videoUrl
  })()
  if (videoUrl && (videoUrl.endsWith(".mp4") || videoUrl.endsWith(".webm") || videoUrl.endsWith(".ogv") || videoUrl.endsWith(".ogg"))) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
        <video
          src={safeDirectUrl}
          poster={poster || undefined}
          controls
          autoPlay
          playsInline
          className="absolute inset-0 h-full w-full bg-black"
          onLoadedMetadata={(e) => {
            const v = e.currentTarget
            setDuration(Math.floor(v.duration || durationSec || 0))
            setReady(true)
          }}
          onTimeUpdate={(e) => {
            const v = e.currentTarget
            setPosition(Math.floor(v.currentTime))
          }}
          onError={(e) => {
            console.error("native video error", e.currentTarget.error)
          }}
        >
          Your browser does not support the video tag.
        </video>
      </div>
    )
  }

  // ============== HLS ==============
  // Any .m3u8 URL OR .ts URL (Xtream serves HLS at the .m3u8 endpoint) — route via hls.js
  if (videoUrl && (videoUrl.endsWith(".m3u8") || videoUrl.endsWith(".ts"))) {
    // For .ts URLs, switch to .m3u8 (Xtream serves HLS at that endpoint)
    const hlsUrl = videoUrl.endsWith(".ts") ? videoUrl.replace(/\.ts$/, ".m3u8") : videoUrl
    return <HlsPlayer src={hlsUrl} poster={poster} title={title} onTime={(p, d) => { setPosition(p); setDuration(d) }} />
  }

  // ============== DASH ==============
  if (videoUrl && videoUrl.endsWith(".mpd")) {
    return <DashPlayer src={videoUrl} poster={poster} title={title} onTime={(p, d) => { setPosition(p); setDuration(d) }} />
  }

  // ============== FALLBACK — link out ==============
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-zinc-950 flex flex-col items-center justify-center gap-3 p-8 text-center">
      {poster && (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-40"
          style={{ backgroundImage: `url(${poster})` }}
        />
      )}
      <div className="relative z-10">
        <p className="text-zinc-300">This title can&apos;t be embedded directly.</p>
        <a
          href={props.originalUrl || videoUrl || "#"}
          target="_blank"
          rel="noreferrer noopener"
          className="mt-3 inline-block rounded-lg bg-cyan-400 px-5 py-2 text-sm font-semibold text-black hover:bg-cyan-300"
        >
          Open original source
        </a>
      </div>
    </div>
  )
}

function HlsPlayer({ src, poster, title, onTime }: { src: string; poster?: string | null; title: string; onTime: (p: number, d: number) => void }) {
  const ref = useRef<HTMLVideoElement>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let hls: any
    import("hls.js").then((mod) => {
      const Hls = mod.default
      const v = ref.current
      if (!v) return
      if (Hls.isSupported()) {
        hls = new Hls({
          // Critical config: route ALL segment + playlist requests through our
          // HTTPS proxy so we avoid mixed-content blocking and CORS errors
          // when the upstream is HTTP-only or doesn't return CORS headers.
          loader: createProxyLoader(Hls.DefaultConfig.loader),
          // Be tolerant of slightly malformed manifests
          manifestLoadingMaxRetry: 4,
          manifestLoadingRetryDelay: 1000,
          levelLoadingMaxRetry: 4,
          fragLoadingMaxRetry: 6,
          fragLoadingRetryDelay: 800,
          // Live stream tuning
          liveDurationInfinity: true,
          liveBackBufferLength: 30,
        })
        hls.loadSource(src)
        hls.attachMedia(v)
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setLoading(false)
          v.play().catch(() => {})
        })
        hls.on(Hls.Events.ERROR, (_evt: any, data: any) => {
          if (data.fatal) {
            // Try to recover before giving up
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                hls.startLoad()
                break
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError()
                break
              default:
                setErr(`HLS fatal: ${data.details || data.type}`)
                break
            }
          }
        })
      } else if (v.canPlayType("application/vnd.apple.mpegurl")) {
        // Safari supports HLS natively — but won't proxy through our loader.
        // If src is HTTP and we're on HTTPS, this will fail; fall back to proxy URL.
        v.src = proxifyUrl(src)
        v.play().catch(() => {})
        setLoading(false)
      } else {
        setErr("HLS not supported in this browser")
      }
    }).catch(() => setErr("Failed to load hls.js"))
    return () => { try { hls?.destroy() } catch {} }
  }, [src])

  if (err) return <FallbackNoPlay title={title} reason={err} />
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80 text-zinc-300">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
            <span className="text-sm">Loading stream…</span>
          </div>
        </div>
      )}
      <video
        ref={ref}
        poster={poster || undefined}
        controls
        autoPlay
        playsInline
        className="absolute inset-0 h-full w-full"
        onLoadedMetadata={(e) => onTime(0, Math.floor(e.currentTarget.duration || 0))}
        onTimeUpdate={(e) => onTime(Math.floor(e.currentTarget.currentTime), 0)}
      />
    </div>
  )
}

// Wrap an hls.js loader class so every request it makes gets routed through
// our /api/iptv/proxy endpoint. This transparently fixes:
//   - Mixed content (HTTP upstream on HTTPS site)
//   - Missing CORS headers on upstream
function createProxyLoader(BaseLoader: any) {
  return class ProxyLoader extends BaseLoader {
    load(context: any, config: any, callbacks: any) {
      try {
        const original = context.url
        // Only wrap absolute http(s):// URLs that aren't already going through our proxy.
        // hls.js resolves relative URLs (like the rewritten segment URLs returned by
        // our proxy) to absolute against the page origin, so we have to detect that case
        // to avoid double-wrapping (which would cause infinite recursion).
        if (original && /^https?:\/\//.test(original) && !original.includes("/api/iptv/proxy")) {
          context.url = proxifyUrl(original)
        }
      } catch {}
      super.load(context, config, callbacks)
    }
  }
}

// Build a proxied URL: /api/iptv/proxy?u=ENCODED
// Only used for absolute http(s) URLs that the browser can't fetch directly.
function proxifyUrl(url: string): string {
  if (!url) return url
  // Don't double-wrap URLs that are already going through our proxy
  if (url.startsWith("/api/iptv/proxy")) return url
  // Don't proxy relative URLs (e.g. /auth/...ts from a playlist hls.js already rewrote)
  if (!/^https?:\/\//.test(url)) return url
  return `/api/iptv/proxy?u=${encodeURIComponent(url)}`
}

function DashPlayer({ src, poster, title, onTime }: { src: string; poster?: string | null; title: string; onTime: (p: number, d: number) => void }) {
  const ref = useRef<HTMLVideoElement>(null)
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => {
    let dash: any
    import("dashjs").then((mod) => {
      const v = ref.current
      if (!v) return
      dash = mod.default.MediaPlayer().create()
      dash.initialize(v, src, true)
      dash.on("error", (e: any) => setErr(`DASH error: ${e?.error?.code || e?.message || "unknown"}`))
    }).catch(() => setErr("Failed to load dashjs"))
    return () => { try { dash?.reset() } catch {} }
  }, [src])
  if (err) return <FallbackNoPlay title={title} reason={err} />
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
      <video
        ref={ref}
        poster={poster || undefined}
        controls
        autoPlay
        className="absolute inset-0 h-full w-full"
        onLoadedMetadata={(e) => onTime(0, Math.floor(e.currentTarget.duration || 0))}
        onTimeUpdate={(e) => onTime(Math.floor(e.currentTarget.currentTime), 0)}
      />
    </div>
  )
}

function FallbackNoPlay({ title, reason }: { title: string; reason?: string }) {
  return (
    <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-xl bg-zinc-950 px-8 text-center">
      <AlertCircle className="h-10 w-10 text-zinc-600" />
      <p className="text-zinc-400">Unable to play &ldquo;{title}&rdquo; in this browser.</p>
      {reason && <p className="text-xs text-zinc-600 max-w-md">{reason}</p>}
      <p className="text-xs text-zinc-600">Try the &ldquo;Open in Web Player&rdquo; option on the Live TV page.</p>
    </div>
  )
}
