import { NextRequest } from "next/server";
import { getActivePlaylist } from "@/lib/playlist";
import { requireUser } from "@/lib/session";
import { buildStreamUrl } from "@/lib/xtream";
import type { StreamType } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function b64url(s: string): string {
  return Buffer.from(s, "utf8").toString("base64url");
}

function unb64url(s: string): string {
  return Buffer.from(s, "base64url").toString("utf8");
}

/**
 * In-memory cookie store: maps a short session token to the Set-Cookie values
 * captured when the m3u8 was fetched. Segment requests reuse these cookies so
 * the upstream (which authenticates the HLS session via the m3u8 response)
 * authorizes them. Entries expire after 10 minutes.
 */
const cookieStore = new Map<string, { cookies: string[]; expires: number }>();
const COOKIE_TTL = 10 * 60 * 1000;

function newToken(): string {
  return b64url(Math.random().toString(36).slice(2) + Date.now().toString(36));
}

function saveCookies(token: string, cookies: string[]) {
  cookieStore.set(token, { cookies, expires: Date.now() + COOKIE_TTL });
  // opportunistically prune
  if (cookieStore.size > 200) {
    const now = Date.now();
    for (const [k, v] of cookieStore) {
      if (v.expires < now) cookieStore.delete(k);
    }
  }
}

function getCookies(token: string | null): string[] {
  if (!token) return [];
  const entry = cookieStore.get(token);
  if (!entry) return [];
  if (entry.expires < Date.now()) {
    cookieStore.delete(token);
    return [];
  }
  return entry.cookies;
}

function rewriteM3u8(text: string, token: string, baseUrl: string): string {
  let origin: string;
  try {
    origin = new URL(baseUrl).origin;
  } catch {
    origin = baseUrl;
  }
  return text
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return line;
      let abs = trimmed;
      if (!/^https?:\/\//i.test(abs)) {
        // Resolve relative segment paths against the m3u8's final origin
        // (which may be a load-balancer IP after a redirect).
        const path = abs.startsWith("/") ? abs : "/" + abs;
        abs = origin + path;
      }
      return `/api/stream?u=${b64url(abs)}&s=${token}`;
    })
    .join("\n");
}

async function pipeResponse(
  upstream: Response,
  init?: { status?: number; headers?: Record<string, string> }
) {
  const headers = new Headers(init?.headers);
  for (const h of [
    "content-type",
    "content-length",
    "content-range",
    "accept-ranges",
    "cache-control",
  ]) {
    const v = upstream.headers.get(h);
    if (v) headers.set(h, v);
  }
  return new Response(upstream.body, {
    status: init?.status ?? upstream.status,
    headers,
  });
}

export async function GET(req: NextRequest) {
  try {
    await requireUser();
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  const playlist = await getActivePlaylist();
  if (!playlist) {
    return new Response("No backend configured", { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const u = searchParams.get("u");
  const s = searchParams.get("s"); // session token (cookie reference)
  const type = searchParams.get("type") as StreamType | null;
  const id = searchParams.get("id");
  const ext = searchParams.get("ext") || undefined;

  let upstreamUrl: string;
  let isMaster = false; // true when this is an m3u8 we should rewrite

  if (u) {
    // Segment/variant request — `u` is the full absolute upstream URL
    // (resolved against the m3u8's final origin when rewritten).
    upstreamUrl = unb64url(u);
  } else if (type && id) {
    upstreamUrl = buildStreamUrl(
      playlist.dns,
      playlist.username,
      playlist.password,
      type,
      id,
      ext
    );
    isMaster = true;
  } else {
    return new Response("Bad request", { status: 400 });
  }

  const upstreamHeaders: Record<string, string> = {
    "User-Agent": "Mozilla/5.0 (compatible; PlayBeat/1.0)",
  };
  // Forward session cookies for segment requests.
  const cookies = getCookies(s);
  if (cookies.length) {
    upstreamHeaders.cookie = cookies.join("; ");
  }
  const range = req.headers.get("range");
  if (range) upstreamHeaders.range = range;

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, {
      headers: upstreamHeaders,
      cache: "no-store",
      redirect: "follow",
    });
  } catch {
    return new Response("Upstream unreachable", { status: 502 });
  }

  // Upstream rejected — surface a clear error instead of a bogus 200.
  if (!upstream.ok && upstream.status !== 206) {
    return new Response(`Upstream error: ${upstream.status}`, {
      status: upstream.status === 401 ? 503 : 502,
    });
  }

  const contentType = upstream.headers.get("content-type") || "";
  const setCookies = upstream.headers.getSetCookie?.() ?? [];
  const looksM3u8 =
    (isMaster || upstreamUrl.includes(".m3u8")) &&
    (contentType.includes("mpegurl") ||
      contentType.includes("m3u8") ||
      contentType.includes("text/plain"));

  if (looksM3u8) {
    const text = await upstream.text();
    // Only treat as a playlist if it actually is one.
    if (!text.trimStart().startsWith("#EXTM3U")) {
      // Not a real m3u8 — return as-is (could be an error page).
      return new Response(text, {
        status: 200,
        headers: { "content-type": contentType || "text/plain" },
      });
    }
    // Capture cookies for downstream segment requests.
    const token = newToken();
    if (setCookies.length) saveCookies(token, setCookies);
    const rewritten = rewriteM3u8(text, token, upstream.url);
    return new Response(rewritten, {
      status: 200,
      headers: {
        "content-type": "application/vnd.apple.mpegurl",
        "cache-control": "no-store",
      },
    });
  }

  return pipeResponse(upstream);
}
