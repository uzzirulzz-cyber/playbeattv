"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Newspaper,
  Trophy,
  Film,
  Sparkles,
  Music,
  Baby,
  Globe,
  Languages,
  Flag,
  Lightbulb,
  Landmark,
  Atom,
  GraduationCap,
  Lock,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/hooks/use-iptv";
import {
  CUSTOM_CATEGORIES,
  matchCustomCategory,
  type CustomCategoryDef,
} from "@/lib/categories";
import {
  liveToMedia,
  vodToMedia,
  seriesToMedia,
  type XtreamLiveStream,
  type XtreamVodStream,
  type XtreamSeries,
} from "@/lib/xtream-client";
import type { MediaItem } from "@/lib/types";
import { ContentGrid } from "@/components/iptv/content-grid";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Newspaper,
  Trophy,
  Film,
  Sparkles,
  Music,
  Baby,
  Globe,
  Languages,
  Flag,
  Lightbulb,
  Landmark,
  Atom,
  GraduationCap,
};

interface XtreamCategory {
  category_id: string;
  category_name: string;
}

export function CategoriesView() {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const { plan, planExpires } = useAuth();
  const setView = useAppStore((s) => s.setView);

  const isMember =
    plan && plan !== "free" && (!planExpires || new Date(planExpires).getTime() > Date.now());

  const selectedCat = selectedSlug
    ? CUSTOM_CATEGORIES.find((c) => c.slug === selectedSlug)
    : null;

  // Fetch all live categories + streams to map into custom categories.
  const { data: liveCats } = useQuery<XtreamCategory[]>({
    queryKey: ["categories", "live_categories"],
    queryFn: () => api<XtreamCategory[]>("/api/xtream?action=live_categories"),
    staleTime: 5 * 60 * 1000,
  });

  const { data: liveStreams } = useQuery({
    queryKey: ["streams", "live_streams"],
    queryFn: () => api<unknown[]>("/api/xtream?action=live_streams"),
    staleTime: 5 * 60 * 1000,
  });

  // Map custom categories to counts of matching Xtream categories.
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    if (!liveCats) return counts;
    for (const cat of CUSTOM_CATEGORIES) {
      counts[cat.slug] = liveCats.filter((xc) =>
        cat.patterns.some((p) =>
          xc.category_name.toLowerCase().includes(p.toLowerCase())
        )
      ).length;
    }
    return counts;
  }, [liveCats]);

  // When a custom category is selected, show matching live streams.
  const matchingItems: MediaItem[] = useMemo(() => {
    if (!selectedCat || !liveStreams || !liveCats) return [];
    // Find Xtream category IDs that match this custom category.
    const matchingCatIds = new Set(
      liveCats
        .filter((xc) =>
          selectedCat.patterns.some((p) =>
            xc.category_name.toLowerCase().includes(p.toLowerCase())
          )
        )
        .map((xc) => xc.category_id)
    );
    return (liveStreams as XtreamLiveStream[])
      .filter((s) => s.category_id && matchingCatIds.has(s.category_id))
      .map((s) => liveToMedia(s, null));
  }, [selectedCat, liveStreams, liveCats]);

  if (selectedCat) {
    const Icon = ICON_MAP[selectedCat.icon] || Globe;
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedSlug(null)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${selectedCat.color}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{selectedCat.name}</h1>
            <p className="text-sm text-muted-foreground">
              {matchingItems.length} channels
              {!isMember ? " · 10% free preview" : ""}
            </p>
          </div>
        </div>

        <ContentGrid
          items={matchingItems}
          loading={!liveStreams}
          injectAdsEvery={24}
          emptyMessage="No channels found in this category."
        />

        {!isMember ? (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
              <Lock className="h-8 w-8 text-primary" />
              <p className="text-sm text-muted-foreground">
                You&apos;re seeing 10% of channels. Subscribe to unlock all{" "}
                {matchingItems.length > 0
                  ? `(${Math.ceil(matchingItems.length * 10)}+ channels)`
                  : "channels"}
                .
              </p>
              <Button
                className="brand-gradient text-white"
                onClick={() => setView("storefront")}
              >
                Unlock All Content
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Browse by Category</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Explore curated content across {CUSTOM_CATEGORIES.length} categories.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {CUSTOM_CATEGORIES.map((cat) => {
          const Icon = ICON_MAP[cat.icon] || Globe;
          const count = categoryCounts[cat.slug] ?? 0;
          return (
            <button
              key={cat.slug}
              type="button"
              onClick={() => setSelectedSlug(cat.slug)}
              className={cn(
                "group relative flex flex-col items-start gap-2 overflow-hidden rounded-xl border border-border bg-gradient-to-br p-4 text-left transition-all hover:border-primary/50 hover:ring-2 hover:ring-primary/20",
                cat.color
              )}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-card/80 text-foreground">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">{cat.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {count > 0 ? `${count} categories` : "Browse"}
                </p>
              </div>
              <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
