"use client";

import { useMemo } from "react";
import { History, Trash2 } from "lucide-react";
import { useHistory } from "@/hooks/use-iptv";
import { ContentGrid } from "@/components/iptv/content-grid";
import { AdBanner } from "@/components/iptv/ads";
import { Button } from "@/components/ui/button";
import type { MediaItem } from "@/lib/types";

export function HistoryView() {
  const { data, isLoading, clearAll } = useHistory();

  const items: MediaItem[] = useMemo(
    () =>
      (data ?? []).map((h) => ({
        id: h.streamId,
        name: h.name,
        type: h.type,
        logo: h.logo ?? undefined,
        streamUrl: h.streamUrl,
      })),
    [data]
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <History className="h-6 w-6 text-primary" />
            Watch History
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {items.length} recent title{items.length === 1 ? "" : "s"}
          </p>
        </div>
        {items.length > 0 ? (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-muted-foreground hover:text-destructive"
            onClick={() => clearAll.mutate()}
            disabled={clearAll.isPending}
          >
            <Trash2 className="h-4 w-4" />
            Clear all
          </Button>
        ) : null}
      </div>

      <AdBanner />

      <ContentGrid
        items={items}
        loading={isLoading}
        injectAdsEvery={24}
        emptyMessage="Nothing watched yet. Your recently played titles will show up here."
      />
    </div>
  );
}
