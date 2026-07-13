"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Search, ChevronDown } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { api, useActivePlaylist } from "@/hooks/use-iptv";
import {
  liveToMedia,
  vodToMedia,
  seriesToMedia,
  type XtreamLiveStream,
  type XtreamVodStream,
  type XtreamSeries,
} from "@/lib/xtream-client";
import type { MediaItem, StreamType } from "@/lib/types";
import { CategoryRail, type Category } from "@/components/iptv/category-rail";
import { ContentGrid } from "@/components/iptv/content-grid";
import { AdBanner } from "@/components/iptv/ads";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface BrowserViewProps {
  type: StreamType;
}

const PAGE_SIZE = 48;

export function BrowserView({ type }: BrowserViewProps) {
  const selectedCategoryId = useAppStore((s) => s.selectedCategoryId);
  const search = useAppStore((s) => s.search);
  const { data: playlistData } = useActivePlaylist();
  const creds = playlistData?.active;

  const action =
    type === "live"
      ? "live_streams"
      : type === "movie"
      ? "vod_streams"
      : "series";
  const catAction =
    type === "live"
      ? "live_categories"
      : type === "movie"
      ? "vod_categories"
      : "series_categories";

  const { data: categories, isLoading: catsLoading } = useQuery<Category[]>({
    queryKey: ["categories", catAction],
    queryFn: () => api<Category[]>(`/api/xtream?action=${catAction}`),
    staleTime: 5 * 60 * 1000,
  });

  const { data: rawStreams, isLoading: streamsLoading, error } = useQuery({
    queryKey: ["streams", action],
    queryFn: () => api<unknown[]>(`/api/xtream?action=${action}`),
    staleTime: 5 * 60 * 1000,
  });

  const items: MediaItem[] = useMemo(() => {
    if (!rawStreams || !creds) return [];
    if (type === "live") {
      return (rawStreams as XtreamLiveStream[]).map((s) =>
        liveToMedia(s, creds)
      );
    }
    if (type === "movie") {
      return (rawStreams as XtreamVodStream[]).map((s) =>
        vodToMedia(s, creds)
      );
    }
    return (rawStreams as XtreamSeries[]).map((s) => seriesToMedia(s, creds));
  }, [rawStreams, creds, type]);

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const it of items) {
      if (it.categoryId) map[it.categoryId] = (map[it.categoryId] ?? 0) + 1;
    }
    return map;
  }, [items]);

  const filtered = useMemo(() => {
    let list = items;
    if (selectedCategoryId !== "all") {
      list = list.filter((i) => i.categoryId === selectedCategoryId);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((i) => i.name.toLowerCase().includes(q));
    }
    return list;
  }, [items, selectedCategoryId, search]);

  const loading = streamsLoading || !creds;

  // Signature so the paginated section resets when filters change
  const pageKey = `${type}|${selectedCategoryId}|${search.trim().toLowerCase()}`;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {type === "live"
            ? "Live TV"
            : type === "movie"
            ? "Movies"
            : "Series"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {items.length > 0
            ? `${items.length.toLocaleString()} titles · ${categories?.length ?? 0} categories`
            : "Loading your content…"}
        </p>
      </div>

      <CategoryRail
        categories={categories ?? []}
        loading={catsLoading}
        counts={counts}
      />

      <AdBanner />

      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Failed to load content</AlertTitle>
          <AlertDescription>
            {error instanceof Error
              ? error.message
              : "The playlist server did not respond."}
          </AlertDescription>
        </Alert>
      ) : null}

      <PaginatedGrid
        key={pageKey}
        items={filtered}
        loading={loading}
        search={search}
      />
    </div>
  );
}

function PaginatedGrid({
  items,
  loading,
  search,
}: {
  items: MediaItem[];
  loading: boolean;
  search: string;
}) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const visible = items.slice(0, visibleCount);

  return (
    <>
      <ContentGrid
        items={visible}
        loading={loading}
        injectAdsEvery={24}
        emptyMessage={
          search
            ? `No results for "${search}".`
            : "No titles in this category."
        }
      />

      {visible.length < items.length ? (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            className="gap-1.5"
          >
            <ChevronDown className="h-4 w-4" />
            Load more
            <span className="text-muted-foreground">
              ({(items.length - visible.length).toLocaleString()} more)
            </span>
          </Button>
        </div>
      ) : null}

      {!loading && items.length === 0 && !search ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <Search className="mb-3 h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            Pick a category above to start browsing.
          </p>
        </div>
      ) : null}
    </>
  );
}
