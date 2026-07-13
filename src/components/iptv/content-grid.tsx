"use client";

import { ContentCard } from "@/components/iptv/content-card";
import type { MediaItem } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

interface ContentGridProps {
  items: MediaItem[];
  loading?: boolean;
  emptyMessage?: string;
  skeletonCount?: number;
}

export function ContentGrid({
  items,
  loading,
  emptyMessage = "No content found.",
  skeletonCount = 18,
}: ContentGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-xl border border-border bg-card"
          >
            <Skeleton className="aspect-[2/3] w-full rounded-none" />
            <div className="p-2.5">
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {items.map((item) => (
        <ContentCard key={`${item.type}-${item.id}`} item={item} />
      ))}
    </div>
  );
}
