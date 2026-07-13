"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ContentCard } from "@/components/iptv/content-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { MediaItem } from "@/lib/types";

interface GenreSection {
  id: string;
  name: string;
  items: MediaItem[];
}

interface GenreSectionsProps {
  sections: GenreSection[];
  loading?: boolean;
  maxItemsPerSection?: number;
  maxSections?: number;
}

/** A horizontal rail of content cards with left/right scroll arrows. */
function ContentRail({ items }: { items: MediaItem[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.8;
    scrollRef.current.scrollBy({
      left: dir === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  return (
    <div className="group/rail relative">
      {/* Left arrow */}
      <button
        type="button"
        aria-label="Scroll left"
        onClick={() => scroll("left")}
        className="absolute left-0 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 text-foreground opacity-0 shadow-md backdrop-blur transition-opacity hover:bg-background group-hover/rail:opacity-100 md:flex"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      {/* Scrollable rail */}
      <div
        ref={scrollRef}
        className="no-scrollbar flex gap-3 overflow-x-auto scroll-smooth pb-2"
      >
        {items.map((item) => (
          <div
            key={`${item.type}-${item.id}`}
            className="w-[140px] shrink-0 sm:w-[160px] md:w-[170px] lg:w-[180px]"
          >
            <ContentCard item={item} />
          </div>
        ))}
      </div>

      {/* Right arrow */}
      <button
        type="button"
        aria-label="Scroll right"
        onClick={() => scroll("right")}
        className="absolute right-0 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 text-foreground opacity-0 shadow-md backdrop-blur transition-opacity hover:bg-background group-hover/rail:opacity-100 md:flex"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}

export function GenreSections({
  sections,
  loading,
  maxItemsPerSection = 24,
  maxSections = 15,
}: GenreSectionsProps) {
  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i}>
            <div className="mb-3 h-6 w-48 animate-pulse rounded bg-muted" />
            <div className="flex gap-3 overflow-hidden">
              {[1, 2, 3, 4, 5, 6].map((j) => (
                <div
                  key={j}
                  className="w-[160px] shrink-0 animate-pulse rounded-lg bg-muted"
                  style={{ aspectRatio: "2/3" }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (sections.length === 0) {
    return null;
  }

  // Show only the top N sections by item count (already sorted by caller).
  const displaySections = sections.slice(0, maxSections);

  return (
    <div className="space-y-6">
      {displaySections.map((section) => {
        if (section.items.length === 0) return null;
        const displayItems = section.items.slice(0, maxItemsPerSection);
        return (
          <section key={section.id}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold tracking-tight">
                {section.name}
              </h2>
              <span className="text-xs text-muted-foreground">
                {section.items.length} titles
              </span>
            </div>
            <ContentRail items={displayItems} />
          </section>
        );
      })}
    </div>
  );
}
