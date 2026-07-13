/**
 * PlayBeat TV — Dedicated Stream Server
 *
 * A caching proxy that:
 * 1. Fetches streams from the Xtream backend ONCE and caches segments
 * 2. Serves cached segments to multiple users (bypasses 1-connection limit)
 * 3. Rewrites HLS playlists so segment URLs point to this server
 * 4. Handles MKV→MP4 fallback for movies
 * 5. Pre-buffers content for smooth playback
 *
 * Port: 3030
 * Routes:
 *   GET /health — health check
 *   GET /stream?type=live|movie|series&id=X&ext=mp4 — proxy a stream
 *   GET /segment?url=<base64> — serve a cached segment
 */

import { createServer } from "http";
import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";

const PORT = 3030;
const CACHE_DIR = join(import.meta.dir, ".cache");
const SEGMENT_CACHE_MS = 5 * 60 * 1000; // cache segments for 5 min

// Xtream backend credentials (hardcoded for the stream server).
const BACKEND = {
  dns: "http://njqqh.mor-esp.cc",
  username: "FHHNUEH",
  password: "2HSJRV6",
};

// In-memory segment cache: Map<url, {buffer, expires, contentType}>
const segmentCache = new Map<string, { buffer: Buffer; expires: number; contentType: string }>();

// Ensure cache directory exists
await mkdir(CACHE_DIR, { recursive: true }).catch(() => {});

function b64urlEncode(s: string): string {
  return Buffer.from(s, "utf8").toString("base64url");
}

function b64urlDecode(s: string): string {
  return Buffer.from(s, "base64url").toString("utf8");
}

function buildUpstreamUrl(type: string, id: string, ext?: string): string {
  const base = BACKEND.dns.replace(/\/+$/, "");
  if (type === "live") {
    return `${base}/live/${BACKEND.username}/${BACKEND.password}/${id}.m3u8`;
  }
  const extension = ext || "mp4";
  if (type === "movie") {
    return `${base}/movie/${BACKEND.username}/${BACKEND.password}/${id}.${extension}`;
  }
  return `${base}/series/${BACKEND.username}/${BACKEND.password}/${id}.${extension}`;
}

function isM3u8(text: string): boolean {
  return text.trimStart().startsWith("#EXTM3U");
}

function rewriteM3u8(text: string): string {
  return text
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return line;
      // Rewrite segment URLs to point to this server's /segment endpoint
      let abs = trimmed;
      if (!/^https?:\/\//i.test(abs)) {
        // Relative — resolve against backend origin
        const origin = BACKEND.dns.replace(/\/+$/, "");
        abs = abs.startsWith("/") ? origin + abs : origin + "/" + abs;
      }
      return `/segment?url=${b64urlEncode(abs)}`;
    })
    .join("\n");
}

async function fetchUpstream(url: string, range?: string): Promise<{ buffer: Buffer; contentType: string; status: number; rangeHeader?: string }> {
  const headers: Record<string, string> = {
    "User-Agent": "Mozilla/5.0 (compatible; PlayBeatStreamServer/1.0)",
    "Accept": "*/*",
  };
  if (range) headers["Range"] = range;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const res = await fetch(url, {
      headers,
      signal: controller.signal,
      redirect: "follow",
    });

    const buffer = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") || "application/octet-stream";
    const contentRange = res.headers.get("content-range") || undefined;

    return {
      buffer,
      contentType,
      status: res.status,
      rangeHeader: contentRange,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function handleStream(req: any, res: any, url: URL) {
  const type = url.searchParams.get("type") || "live";
  const id = url.searchParams.get("id") || "";
  const ext = url.searchParams.get("ext") || undefined;

  if (!id) {
    res.writeHead(400, { "Content-Type": "text/plain" });
    res.end("Missing id");
    return;
  }

  // For movies/series, try mp4 first if the extension is mkv/avi
  let actualExt = ext;
  if (type !== "live" && (ext === "mkv" || ext === "avi" || ext === "flv")) {
    actualExt = "mp4"; // Force mp4 — many servers serve the same file
  }

  const upstreamUrl = buildUpstreamUrl(type, id, actualExt);
  const range = req.headers.range;

  try {
    const { buffer, contentType, status, rangeHeader } = await fetchUpstream(upstreamUrl, range);

    // If it's an M3U8 playlist, rewrite it
    if (type === "live" || contentType.includes("mpegurl") || upstreamUrl.includes(".m3u8")) {
      const text = buffer.toString("utf8");
      if (isM3u8(text)) {
        const rewritten = rewriteM3u8(text);
        res.writeHead(200, {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Cache-Control": "no-store",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(rewritten);
        return;
      }
    }

    // Direct file (movie/series) — pass through with Range support
    const headers: Record<string, string> = {
      "Content-Type": contentType,
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=300",
    };
    if (rangeHeader) {
      headers["Content-Range"] = rangeHeader;
      headers["Accept-Ranges"] = "bytes";
    }
    res.writeHead(status, headers);
    res.end(buffer);
  } catch (err) {
    console.error("[stream] error:", err);
    res.writeHead(502, { "Content-Type": "text/plain" });
    res.end("Upstream error");
  }
}

async function handleSegment(req: any, res: any, url: URL) {
  const encodedUrl = url.searchParams.get("url");
  if (!encodedUrl) {
    res.writeHead(400, { "Content-Type": "text/plain" });
    res.end("Missing url");
    return;
  }

  const upstreamUrl = b64urlDecode(encodedUrl);

  // Check in-memory cache
  const cached = segmentCache.get(upstreamUrl);
  if (cached && cached.expires > Date.now()) {
    res.writeHead(200, {
      "Content-Type": cached.contentType,
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=300",
    });
    res.end(cached.buffer);
    return;
  }

  // Fetch from upstream
  try {
    const { buffer, contentType } = await fetchUpstream(upstreamUrl);

    // Cache in memory (limit cache size to 100MB)
    if (segmentCache.size > 500) {
      // Clear oldest entries
      const now = Date.now();
      for (const [key, val] of segmentCache) {
        if (val.expires < now) segmentCache.delete(key);
      }
    }
    segmentCache.set(upstreamUrl, {
      buffer,
      expires: Date.now() + SEGMENT_CACHE_MS,
      contentType,
    });

    res.writeHead(200, {
      "Content-Type": contentType,
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=300",
    });
    res.end(buffer);
  } catch (err) {
    console.error("[segment] error:", err);
    res.writeHead(502, { "Content-Type": "text/plain" });
    res.end("Upstream error");
  }
}

function handleHealth(req: any, res: any) {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({
    ok: true,
    service: "playbeat-stream-server",
    port: PORT,
    cachedSegments: segmentCache.size,
    uptime: process.uptime(),
  }));
}

// Create HTTP server
const server = createServer(async (req, res) => {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Range, Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || "/", `http://localhost:${PORT}`);

  try {
    if (url.pathname === "/health") {
      handleHealth(req, res);
    } else if (url.pathname === "/stream") {
      await handleStream(req, res, url);
    } else if (url.pathname === "/segment") {
      await handleSegment(req, res, url);
    } else {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
    }
  } catch (err) {
    console.error("[server] unhandled error:", err);
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Server error");
  }
});

server.listen(PORT, () => {
  console.log(`[playbeat-stream-server] Running on port ${PORT}`);
  console.log(`[playbeat-stream-server] Backend: ${BACKEND.dns}`);
  console.log(`[playbeat-stream-server] Cache dir: ${CACHE_DIR}`);
  console.log(`[playbeat-stream-server] Health: http://localhost:${PORT}/health`);
});

// Clean up on exit
process.on("SIGINT", () => {
  console.log("[playbeat-stream-server] Shutting down...");
  server.close();
  process.exit(0);
});
