"use client"

import { useEffect, useRef, useState } from "react"
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
  // Wikimedia files are typically .webm — play natively
  // For .m3u8/.mpd we'd need hls.js/dash.js — handle in next iteration
  const videoUrl = streamUrl || embedUrl
  if (videoUrl && (videoUrl.endsWith(".mp4") || videoUrl.endsWith(".webm") || videoUrl.endsWith(".ogv") || videoUrl.endsWith(".ogg"))) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
        <video
          src={videoUrl}
          poster={poster || undefined}
          controls
          autoPlay
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
        >
          Your browser does not support the video tag.
        </video>
      </div>
    )
  }

  // ============== HLS ==============
  if (videoUrl && videoUrl.endsWith(".m3u8")) {
    // Dynamic import of hls.js
    return <HlsPlayer src={videoUrl} poster={poster} title={title} onTime={(p, d) => { setPosition(p); setDuration(d) }} />
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
  const [err, setErr] = useState(false)
  useEffect(() => {
    let hls: any
    import("hls.js").then((mod) => {
      const Hls = mod.default
      const v = ref.current
      if (!v) return
      if (Hls.isSupported()) {
        hls = new Hls()
        hls.loadSource(src)
        hls.attachMedia(v)
        hls.on(Hls.Events.MANIFEST_PARSED, () => v.play().catch(() => {}))
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) setErr(true)
        })
      } else if (v.canPlayType("application/vnd.apple.mpegurl")) {
        v.src = src
        v.play().catch(() => {})
      } else {
        setErr(true)
      }
    }).catch(() => setErr(true))
    return () => { try { hls?.destroy() } catch {} }
  }, [src])
  if (err) return <FallbackNoPlay title={title} />
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

function DashPlayer({ src, poster, title, onTime }: { src: string; poster?: string | null; title: string; onTime: (p: number, d: number) => void }) {
  const ref = useRef<HTMLVideoElement>(null)
  const [err, setErr] = useState(false)
  useEffect(() => {
    let dash: any
    import("dashjs").then((mod) => {
      const v = ref.current
      if (!v) return
      dash = mod.default.MediaPlayer().create()
      dash.initialize(v, src, true)
      dash.on("error", () => setErr(true))
    }).catch(() => setErr(true))
    return () => { try { dash?.reset() } catch {} }
  }, [src])
  if (err) return <FallbackNoPlay title={title} />
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

function FallbackNoPlay({ title }: { title: string }) {
  return (
    <div className="flex aspect-video w-full items-center justify-center rounded-xl bg-zinc-950 text-zinc-400">
      <p className="px-8 text-center">Unable to play &ldquo;{title}&rdquo; in this browser.</p>
    </div>
  )
}
