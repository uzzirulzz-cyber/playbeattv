import { db } from "@/lib/db";

export interface XtreamUserInfo {
  username?: string;
  password?: string;
  message?: string;
  server_info?: {
    url?: string;
    port?: string;
    https_port?: string;
    server_protocol?: string;
    rtmp_port?: string;
    timezone?: string;
    timestamp_now?: number;
    time_now?: string;
  };
  user_info?: {
    username?: string;
    password?: string;
    message?: string;
    auth?: number;
    status?: string;
    exp_date?: string | null;
    is_trial?: string;
    active_cons?: string;
    created_at?: string;
    max_connections?: string;
    allowed_output_formats?: string[];
  };
}

export interface XtreamCategory {
  category_id: string;
  category_name: string;
  parent_id?: number;
}

export interface XtreamLiveStream {
  num?: number;
  name: string;
  stream_type: string;
  stream_id: number;
  stream_icon?: string;
  epg_channel_id?: string | null;
  added?: string;
  category_id?: string;
  custom_sid?: string;
  tv_archive?: number;
  direct_source?: string;
  tv_archive_duration?: number;
}

export interface XtreamVodStream {
  num?: number;
  name: string;
  stream_type: string;
  stream_id: number;
  stream_icon?: string;
  rating?: string | number;
  rating_5based?: number;
  added?: string;
  category_id?: string;
  container_extension?: string;
  custom_sid?: string;
  direct_source?: string;
}

export interface XtreamSeries {
  num?: number;
  name: string;
  series_id: number;
  cover?: string;
  plot?: string;
  cast?: string;
  director?: string;
  genre?: string;
  releaseDate?: string;
  last_modified?: string;
  rating?: string;
  rating_5based?: number;
  category_id?: string;
}

export interface XtreamSeriesInfo {
  seasons?: Array<{
    season_number: number;
    name?: string;
    air_date?: string;
    episode_count?: number;
    cover?: string;
    overview?: string;
  }>;
  info?: {
    name?: string;
    cover?: string;
    plot?: string;
    cast?: string;
    director?: string;
    genre?: string;
    releaseDate?: string;
    rating?: string;
    duration?: string;
    duration_secs?: number;
    bitrate?: number;
    season_count?: number;
    episode_run_time?: string;
    category_id?: string;
  };
  episodes?: Record<
    string,
    Array<{
      id: string;
      episode_num: number;
      title: string;
      container_extension: string;
      info?: { movie_image?: string; plot?: string; duration_secs?: number; rating?: string };
      added?: string;
      season?: number;
    }>
  >;
  movie_image?: string;
  plot?: string;
  releasedate?: string;
  name?: string;
}

function normalizeDns(dns: string): string {
  let d = dns.trim();
  if (!/^https?:\/\//i.test(d)) {
    d = "http://" + d;
  }
  // remove trailing slash
  return d.replace(/\/+$/, "");
}

export function buildStreamUrl(
  dns: string,
  username: string,
  password: string,
  type: "live" | "movie" | "series",
  streamId: string | number,
  containerExtension?: string
): string {
  const base = normalizeDns(dns);
  if (type === "live") {
    // prefer m3u8 for HLS playback in browser; .ts often blocked by CORS / no MSE
    return `${base}/live/${username}/${password}/${streamId}.m3u8`;
  }
  const ext = containerExtension || "mp4";
  if (type === "movie") {
    return `${base}/movie/${username}/${password}/${streamId}.${ext}`;
  }
  return `${base}/series/${username}/${password}/${streamId}.${ext}`;
}

async function fetchXtream<T>(
  dns: string,
  username: string,
  password: string,
  action?: string,
  extraParams: Record<string, string | number> = {}
): Promise<T> {
  const base = normalizeDns(dns);
  const params = new URLSearchParams({
    username,
    password,
  });
  if (action) params.set("action", action);
  for (const [k, v] of Object.entries(extraParams)) {
    params.set(k, String(v));
  }
  const url = `${base}/player_api.php?${params.toString()}`;

  // In-memory cache for large list endpoints (vod_streams, live_streams, series).
  // These can take 7-10s to fetch and rarely change, so we cache for 10 minutes.
  const cacheKey = url;
  const cached = xtreamCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return cached.data as T;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; IPTV-Player/1.0)",
        Accept: "application/json, text/plain, */*",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Xtream API error: HTTP ${res.status}`);
    }

    const text = await res.text();
    if (!text) return [] as unknown as T;
    let parsed: T;
    try {
      parsed = JSON.parse(text) as T;
    } catch {
      throw new Error("Xtream API returned invalid JSON");
    }

    // Cache list responses (arrays) for 10 minutes to avoid slow refetches.
    if (Array.isArray(parsed)) {
      xtreamCache.set(cacheKey, {
        data: parsed,
        expires: Date.now() + 10 * 60 * 1000,
      });
    }

    return parsed;
  } finally {
    clearTimeout(timeout);
  }
}

// Simple in-memory cache for Xtream API responses.
const xtreamCache = new Map<string, { data: unknown; expires: number }>();

export async function authenticateXtream(
  dns: string,
  username: string,
  password: string
): Promise<XtreamUserInfo> {
  return fetchXtream<XtreamUserInfo>(dns, username, password);
}

export async function getLiveCategories(
  dns: string,
  username: string,
  password: string
): Promise<XtreamCategory[]> {
  const data = await fetchXtream<XtreamCategory[]>(
    dns,
    username,
    password,
    "get_live_categories"
  );
  return Array.isArray(data) ? data : [];
}

export async function getLiveStreams(
  dns: string,
  username: string,
  password: string,
  categoryId?: string
): Promise<XtreamLiveStream[]> {
  const data = await fetchXtream<XtreamLiveStream[]>(
    dns,
    username,
    password,
    "get_live_streams",
    categoryId ? { category_id: categoryId } : {}
  );
  return Array.isArray(data) ? data : [];
}

export async function getVodCategories(
  dns: string,
  username: string,
  password: string
): Promise<XtreamCategory[]> {
  const data = await fetchXtream<XtreamCategory[]>(
    dns,
    username,
    password,
    "get_vod_categories"
  );
  return Array.isArray(data) ? data : [];
}

export async function getVodStreams(
  dns: string,
  username: string,
  password: string,
  categoryId?: string
): Promise<XtreamVodStream[]> {
  const data = await fetchXtream<XtreamVodStream[]>(
    dns,
    username,
    password,
    "get_vod_streams",
    categoryId ? { category_id: categoryId } : {}
  );
  return Array.isArray(data) ? data : [];
}

export async function getVodInfo(
  dns: string,
  username: string,
  password: string,
  vodId: number
) {
  return fetchXtream(
    dns,
    username,
    password,
    "get_vod_info",
    { vod_id: vodId }
  );
}

export async function getSeriesCategories(
  dns: string,
  username: string,
  password: string
): Promise<XtreamCategory[]> {
  const data = await fetchXtream<XtreamCategory[]>(
    dns,
    username,
    password,
    "get_series_categories"
  );
  return Array.isArray(data) ? data : [];
}

export async function getSeries(
  dns: string,
  username: string,
  password: string,
  categoryId?: string
): Promise<XtreamSeries[]> {
  const data = await fetchXtream<XtreamSeries[]>(
    dns,
    username,
    password,
    "get_series",
    categoryId ? { category_id: categoryId } : {}
  );
  return Array.isArray(data) ? data : [];
}

export async function getSeriesInfo(
  dns: string,
  username: string,
  password: string,
  seriesId: number
): Promise<XtreamSeriesInfo> {
  return fetchXtream<XtreamSeriesInfo>(
    dns,
    username,
    password,
    "get_series_info",
    { series_id: seriesId }
  );
}

/** Ensure a default playlist exists from the provided credentials. */
export async function ensureDefaultPlaylist() {
  const count = await db.playlist.count();
  if (count === 0) {
    const playlist = await db.playlist.create({
      data: {
        name: "HypoTV Playlist",
        dns: "http://njqqh.mor-esp.cc",
        username: "FHHNUEH",
        password: "2HSJRV6",
        active: true,
      },
    });
    return playlist;
  }

  // make sure exactly one is active
  const active = await db.playlist.findFirst({ where: { active: true } });
  if (!active) {
    const first = await db.playlist.findFirst({ orderBy: { createdAt: "asc" } });
    if (first) {
      await db.playlist.update({
        where: { id: first.id },
        data: { active: true },
      });
    }
  }
  return await db.playlist.findFirst({ where: { active: true } });
}

export { normalizeDns };
