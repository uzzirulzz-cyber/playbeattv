"use client";

import { useMemo, useState } from "react";
import { Heart } from "lucide-react";
import { useFavorites } from "@/hooks/use-iptv";
import { ContentGrid } from "@/components/iptv/content-grid";
import { AdBanner } from "@/components/iptv/ads";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { MediaItem, StreamType } from "@/lib/types";

export function FavoritesView() {
  const { data, isLoading } = useFavorites();
  const [filter, setFilter] = useState<"all" | StreamType>("all");

  const items: MediaItem[] = useMemo(
    () =>
      (data ?? []).map((f) => ({
        id: f.streamId,
        name: f.name,
        type: f.type,
        logo: f.logo ?? undefined,
        streamUrl: f.streamUrl,
        categoryId: f.categoryId ?? undefined,
      })),
    [data]
  );

  const counts = useMemo(() => {
    return {
      all: items.length,
      live: items.filter((i) => i.type === "live").length,
      movie: items.filter((i) => i.type === "movie").length,
      series: items.filter((i) => i.type === "series").length,
    };
  }, [items]);

  const filtered =
    filter === "all" ? items : items.filter((i) => i.type === filter);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Heart className="h-6 w-6 text-red-400" />
            Favorites
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {items.length} saved title{items.length === 1 ? "" : "s"}
          </p>
        </div>
        {items.length > 0 ? (
          <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <TabsList>
              <TabsTrigger value="all">
                All ({counts.all})
              </TabsTrigger>
              <TabsTrigger value="live">Live ({counts.live})</TabsTrigger>
              <TabsTrigger value="movie">Movies ({counts.movie})</TabsTrigger>
              <TabsTrigger value="series">Series ({counts.series})</TabsTrigger>
            </TabsList>
          </Tabs>
        ) : null}
      </div>

      <AdBanner />

      <ContentGrid
        items={filtered}
        loading={isLoading}
        injectAdsEvery={24}
        emptyMessage="No favorites yet. Tap the heart on any title to save it here."
      />
    </div>
  );
}
