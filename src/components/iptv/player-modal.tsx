"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import {
  X,
  Heart,
  Loader2,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { useFavorites, useHistory } from "@/hooks/use-iptv";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PlayerModal() {
  const player = useAppStore((s) => s.player);
  const closePlayer = useAppStore((s) => s.closePlayer);
  const { isFavorite, toggle } = useFavorites();
  const { upsert } = useHistory();

  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const open = player.open;
  const fav = open ? isFavorite(player.streamId, player.type) : false;

  const cleanup = useCallback(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.removeAttribute("src");
      videoRef.current.load();
    }
  }, []);

  // Setup the stream when opened or retried
  useEffect(() => {
    if (!open || !player.streamUrl) return;

    // Resetting loading/error for the new stream is a valid external-system sync.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);

    const video = videoRef.current;
    if (!video) return;

    const isHls =
      player.streamUrl.includes(".m3u8") ||
      player.streamUrl.includes("m3u8");

    const startPlayback = () => {
      setLoading(false);
      video.play().catch(() => {
        /* autoplay may be blocked; user can press play */
      });
    };

    if (isHls) {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: player.type === "live",
          backBufferLength: 90,
        });
        hlsRef.current = hls;
        hls.loadSource(player.streamUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, startPlayback);
        hls.on(Hls.Events.ERROR, (_e, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError();
                break;
              default:
                setError(
                  "This stream could not be played. It may be offline, geo-blocked, or unsupported in the browser."
                );
                setLoading(false);
                break;
            }
          }
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        // Safari native HLS
        video.src = player.streamUrl;
        video.addEventListener("loadedmetadata", startPlayback, { once: true });
      } else {
        setError("HLS playback is not supported in this browser.");
        setLoading(false);
      }
    } else {
      // Direct file (mp4 etc.)
      video.src = player.streamUrl;
      video.addEventListener("loadedmetadata", startPlayback, { once: true });
      video.addEventListener(
        "error",
        () => {
          setError(
            "This media could not be loaded. The server may be blocking playback."
          );
          setLoading(false);
        },
        { once: true }
      );
    }

    return cleanup;
  }, [open, player.streamUrl, retryKey]);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      el.requestFullscreen().catch(() => {});
    }
  };

  // Keyboard: Esc to close, F for fullscreen
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePlayer();
      if (e.key === "f" || e.key === "F") toggleFullscreen();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // History tracking
  useEffect(() => {
    if (!open) return;
    const video = videoRef.current;
    if (!video) return;

    let lastSave = 0;
    const onTimeUpdate = () => {
      const now = Date.now();
      if (now - lastSave > 8000) {
        lastSave = now;
        upsert.mutate({
          streamId: player.streamId,
          name: player.title,
          type: player.type,
          logo: player.logo,
          streamUrl: player.streamUrl,
          progress: Math.floor(video.currentTime),
          duration: Math.floor(video.duration || 0),
        });
      }
    };
    video.addEventListener("timeupdate", onTimeUpdate);
    return () => video.removeEventListener("timeupdate", onTimeUpdate);
  }, [open, player.streamId]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black"
      role="dialog"
      aria-modal="true"
      aria-label={`Playing ${player.title}`}
    >
      {/* Top bar */}
      <div className="absolute left-0 right-0 top-0 z-20 flex items-center gap-3 bg-gradient-to-b from-black/80 to-transparent p-4">
        {player.logo ? (
          <img
            src={player.logo}
            alt=""
            className="h-9 w-9 rounded-md object-cover"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold text-white sm:text-lg">
            {player.title}
          </h2>
          <p className="text-xs text-white/60">
            {player.type === "live"
              ? "Live Channel"
              : player.type === "movie"
              ? "Movie"
              : "Episode"}
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          className="gap-1.5"
          onClick={() =>
            toggle({
              streamId: player.streamId,
              name: player.title,
              type: player.type,
              streamUrl: player.streamUrl,
              logo: player.logo,
              categoryId: player.categoryId,
            })
          }
        >
          <Heart className={cn("h-4 w-4", fav && "fill-red-500 text-red-500")} />
          <span className="hidden sm:inline">
            {fav ? "Saved" : "Favorite"}
          </span>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/10 hover:text-white"
          aria-label="Close player"
          onClick={closePlayer}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Video stage */}
      <div
        ref={containerRef}
        className="relative flex flex-1 items-center justify-center bg-black"
      >
        <video
          ref={videoRef}
          className="max-h-full max-w-full"
          controls
          autoPlay
          playsInline
        />

        {loading ? (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 text-white">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-white/70">Loading stream…</p>
          </div>
        ) : null}

        {error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/15 text-red-400">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <div className="max-w-md space-y-1">
              <h3 className="text-lg font-semibold text-white">
                Playback Error
              </h3>
              <p className="text-sm text-white/60">{error}</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="gap-1.5"
                onClick={() => setRetryKey((k) => k + 1)}
              >
                <RefreshCw className="h-4 w-4" />
                Retry
              </Button>
              <a
                href={player.streamUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm" className="gap-1.5">
                  <ExternalLink className="h-4 w-4" />
                  Open directly
                </Button>
              </a>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
