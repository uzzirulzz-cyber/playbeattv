import type { MediaItem, StreamType } from "@/lib/types";

/**
 * Build a *proxied* stream URL that hides the IPTV backend credentials.
 * The browser only ever sees `/api/stream?...`; the server reconstructs
 * the real upstream URL from the (admin-managed) active playlist.
 */
export function buildStreamUrl(
  _dns: string,
  _username: string,
  _password: string,
  type: StreamType,
  streamId: string | number,
  containerExtension?: string
): string {
  const params = new URLSearchParams({
    type,
    id: String(streamId),
  });
  if (containerExtension) params.set("ext", containerExtension);
  return `/api/stream?${params.toString()}`;
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
  _creds: unknown
): MediaItem {
  return {
    id: String(s.stream_id),
    name: s.name,
    type: "live",
    logo: s.stream_icon,
    streamUrl: buildStreamUrl("", "", "", "live", s.stream_id),
    categoryId: s.category_id,
  };
}

export function vodToMedia(
  s: XtreamVodStream,
  _creds: unknown
): MediaItem {
  return {
    id: String(s.stream_id),
    name: s.name,
    type: "movie",
    logo: s.stream_icon,
    streamUrl: buildStreamUrl(
      "",
      "",
      "",
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
  _creds: unknown
): MediaItem {
  return {
    id: String(s.series_id),
    name: s.name,
    type: "series",
    logo: s.cover,
    plot: s.plot,
    streamUrl: buildStreamUrl("", "", "", "series", s.series_id, "mp4"),
    categoryId: s.category_id,
    rating: s.rating_5based ?? (s.rating ? Number(s.rating) : undefined),
  };
}
