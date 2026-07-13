"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Play, Star, Calendar, Clock } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { api } from "@/hooks/use-iptv";
import { buildStreamUrl } from "@/lib/xtream-client";

interface SeriesInfo {
  seasons?: Array<{
    season_number: number;
    name?: string;
    air_date?: string;
    episode_count?: number;
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
    season_count?: number;
    category_id?: string;
  };
  episodes?: Record<
    string,
    Array<{
      id: string;
      episode_num: number;
      title: string;
      container_extension: string;
      info?: {
        movie_image?: string;
        plot?: string;
        duration_secs?: number;
        rating?: string;
      };
      added?: string;
      season?: number;
    }>
  >;
}

function formatDuration(secs?: number) {
  if (!secs) return null;
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function SeriesDetailDialog() {
  const { seriesDetail, closeSeriesDetail, openPlayer } = useAppStore();
  const [season, setSeason] = useState<string>("1");

  const { data, isLoading } = useQuery<SeriesInfo>({
    queryKey: ["series-info", seriesDetail.seriesId],
    queryFn: () =>
      api<SeriesInfo>(
        `/api/xtream?action=series_info&series_id=${seriesDetail.seriesId}`
      ),
    enabled: seriesDetail.open && seriesDetail.seriesId != null,
  });

  const seasons = data?.seasons ?? [];
  const seasonKeys = Object.keys(data?.episodes ?? {}).sort(
    (a, b) => Number(a) - Number(b)
  );
  const activeSeason = seasonKeys.includes(season)
    ? season
    : seasonKeys[0] ?? "1";
  const episodes = data?.episodes?.[activeSeason] ?? [];

  const title = data?.info?.name || seriesDetail.name || "Series";
  const plot = data?.info?.plot || seriesDetail.plot;
  const cover = data?.info?.cover || seriesDetail.cover;
  const rating = data?.info?.rating;

  return (
    <Dialog
      open={seriesDetail.open}
      onOpenChange={(o) => !o && closeSeriesDetail()}
    >
      <DialogContent className="max-w-4xl gap-0 overflow-hidden p-0 sm:max-w-5xl">
        <DialogHeader className="sr-only">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {/* Header banner */}
        <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:p-6">
          <div className="relative aspect-[2/3] w-28 shrink-0 overflow-hidden rounded-lg bg-muted sm:w-36">
            {cover ? (
              <img
                src={cover}
                alt={title}
                className="h-full w-full object-cover"
              />
            ) : null}
          </div>

          <div className="flex min-w-0 flex-1 flex-col">
            <h2 className="text-xl font-bold leading-tight sm:text-2xl">
              {title}
            </h2>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {rating ? (
                <span className="inline-flex items-center gap-1 text-amber-400">
                  <Star className="h-4 w-4 fill-current" />
                  {Number(rating).toFixed(1)}
                </span>
              ) : null}
              {data?.info?.releaseDate ? (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {String(data.info.releaseDate).slice(0, 4)}
                </span>
              ) : null}
              {data?.info?.duration ? (
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {data.info.duration}
                </span>
              ) : null}
              {data?.info?.genre ? (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                  {data.info.genre}
                </span>
              ) : null}
            </div>

            {plot ? (
              <p className="mt-3 line-clamp-4 text-sm text-muted-foreground">
                {plot}
              </p>
            ) : null}

            {data?.info?.cast ? (
              <p className="mt-2 line-clamp-1 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Cast:</span>{" "}
                {data.info.cast}
              </p>
            ) : null}
            {data?.info?.director ? (
              <p className="line-clamp-1 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Director:</span>{" "}
                {data.info.director}
              </p>
            ) : null}
          </div>
        </div>

        {/* Seasons + episodes */}
        <div className="border-t border-border">
          {isLoading ? (
            <div className="space-y-3 p-5">
              <Skeleton className="h-9 w-64" />
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            </div>
          ) : seasonKeys.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No episodes available for this series.
            </div>
          ) : (
            <div className="p-5">
              <Tabs
                value={activeSeason}
                onValueChange={setSeason}
                className="w-full"
              >
                <ScrollArea className="w-full whitespace-nowrap">
                  <TabsList className="mb-4 inline-flex h-auto w-max gap-1 bg-muted/50 p-1">
                    {seasonKeys.map((s) => (
                      <TabsTrigger
                        key={s}
                        value={s}
                        className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                      >
                        Season {s}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </ScrollArea>

                <div className="max-h-[40vh] space-y-2 overflow-y-auto pr-1 scrollbar-thin">
                  {episodes.map((ep) => {
                    const streamUrl = buildStreamUrl(
                      "",
                      "",
                      "",
                      "series",
                      ep.id,
                      ep.container_extension
                    );
                    return (
                      <button
                        key={ep.id}
                        type="button"
                        onClick={() =>
                          openPlayer({
                            streamUrl,
                            title: `${title} — S${activeSeason} E${ep.episode_num}: ${ep.title}`,
                            logo: ep.info?.movie_image || cover,
                            type: "series",
                            streamId: ep.id,
                          })
                        }
                        className="group flex w-full items-center gap-3 rounded-lg border border-border bg-card p-2.5 text-left transition-colors hover:border-primary/50 hover:bg-accent"
                      >
                        <div className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-md bg-muted sm:w-32">
                          {ep.info?.movie_image ? (
                            <img
                              src={ep.info.movie_image}
                              alt={ep.title}
                              className="h-full w-full object-cover"
                            />
                          ) : null}
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                            <Play className="h-6 w-6 fill-white text-white" />
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            <span className="text-muted-foreground">
                              E{ep.episode_num}.
                            </span>{" "}
                            {ep.title}
                          </p>
                          {ep.info?.plot ? (
                            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                              {ep.info.plot}
                            </p>
                          ) : null}
                          <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                            {ep.info?.duration_secs
                              ? formatDuration(ep.info.duration_secs)
                              : null}
                            {ep.info?.rating
                              ? `★ ${Number(ep.info.rating).toFixed(1)}`
                              : null}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </Tabs>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
