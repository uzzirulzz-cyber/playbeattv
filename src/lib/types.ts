export type ViewId =
  | "home"
  | "live"
  | "movies"
  | "series"
  | "favorites"
  | "history";

export type StreamType = "live" | "movie" | "series";

export interface MediaItem {
  id: string;
  name: string;
  type: StreamType;
  logo?: string;
  streamUrl: string;
  categoryId?: string;
  rating?: number;
  plot?: string;
  containerExtension?: string;
}

export interface PlayerState {
  open: boolean;
  streamUrl: string;
  title: string;
  logo?: string;
  type: StreamType;
  streamId: string;
  categoryId?: string;
}

export interface SeriesDetailState {
  open: boolean;
  seriesId: number | null;
  name?: string;
  cover?: string;
  plot?: string;
}
