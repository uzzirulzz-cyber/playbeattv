import type { MediaItem, StreamType } from "@/lib/types";

function normalizeDns(dns: string): string {
  let d = dns.trim();
  if (!/^https?:\/\//i.test(d)) {
    d = "http://" + d;
  }
  return d.replace(/\/+$/, "");
}

export interface PlaylistCredentials {
  dns: string;
  username: string;
  password: string;
}

/** Build a playable stream URL from the active playlist credentials. */
export function buildStreamUrl(
  dns: string,
  username: string,
  password: string,
  type: StreamType,
  streamId: string | number,
  containerExtension?: string
): string {
  const base = normalizeDns(dns);
  if (type === "live") {
    return `${base}/live/${username}/${password}/${streamId}.m3u8`;
  }
  const ext = containerExtension || "mp4";
  if (type === "movie") {
    return `${base}/movie/${username}/${password}/${streamId}.${ext}`;
  }
  return `${base}/series/${username}/${password}/${streamId}.${ext}`;
}

export interface XtreamLiveStream {
  stream_id: number;
  name: string;
  stream_icon?: string;
  category_id?: string;
  epg_channel_id?: string | null;
}

export interface XtreamVodStream {
  stream_id: number;
  name: string;
  stream_icon?: string;
  category_id?: string;
  container_extension?: string;
  rating?: string | number;
  rating_5based?: number;
}

export interface XtreamSeries {
  series_id: number;
  name: string;
  cover?: string;
  plot?: string;
  category_id?: string;
  rating?: string;
  rating_5based?: number;
}

export function liveToMedia(
  s: XtreamLiveStream,
  creds: PlaylistCredentials
): MediaItem {
  return {
    id: String(s.stream_id),
    name: s.name,
    type: "live",
    logo: s.stream_icon,
    streamUrl: buildStreamUrl(
      creds.dns,
      creds.username,
      creds.password,
      "live",
      s.stream_id
    ),
    categoryId: s.category_id,
  };
}

export function vodToMedia(
  s: XtreamVodStream,
  creds: PlaylistCredentials
): MediaItem {
  return {
    id: String(s.stream_id),
    name: s.name,
    type: "movie",
    logo: s.stream_icon,
    streamUrl: buildStreamUrl(
      creds.dns,
      creds.username,
      creds.password,
      "movie",
      s.stream_id,
      s.container_extension
    ),
    categoryId: s.category_id,
    rating: s.rating_5based ?? (s.rating ? Number(s.rating) : undefined),
    containerExtension: s.container_extension,
  };
}

export function seriesToMedia(
  s: XtreamSeries,
  creds: PlaylistCredentials
): MediaItem {
  return {
    id: String(s.series_id),
    name: s.name,
    type: "series",
    logo: s.cover,
    plot: s.plot,
    streamUrl: buildStreamUrl(
      creds.dns,
      creds.username,
      creds.password,
      "series",
      s.series_id,
      "mp4"
    ),
    categoryId: s.category_id,
    rating: s.rating_5based ?? (s.rating ? Number(s.rating) : undefined),
  };
}
