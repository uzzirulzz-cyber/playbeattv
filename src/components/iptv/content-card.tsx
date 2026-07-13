"use client";

import { useState } from "react";
import Image from "next/image";
import { Heart, Play, Star, Tv, Film, Clapperboard } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MediaItem } from "@/lib/types";
import { useFavorites } from "@/hooks/use-iptv";
import { useAppStore } from "@/lib/store";
import { useAuth } from "@/hooks/use-auth";

interface ContentCardProps {
  item: MediaItem;
  index?: number;
}

function TypeBadge({ type }: { type: MediaItem["type"] }) {
  const map = {
    live: { label: "LIVE", icon: Tv, className: "bg-red-500/90 text-white" },
    movie: { label: "MOVIE", icon: Film, className: "bg-amber-500/90 text-black" },
    series: { label: "SERIES", icon: Clapperboard, className: "bg-primary/90 text-primary-foreground" },
  } as const;
  const cfg = map[type];
  const Icon = cfg.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold tracking-wide",
        cfg.className
      )}
    >
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

export function ContentCard({ item }: ContentCardProps) {
  const { isFavorite, toggle } = useFavorites();
  const openPlayer = useAppStore((s) => s.openPlayer);
  const openSeriesDetail = useAppStore((s) => s.openSeriesDetail);
  const openAuth = useAppStore((s) => s.openAuth);
  const { isAuthenticated } = useAuth();
  const [imgError, setImgError] = useState(false);

  const fav = isFavorite(item.id, item.type);

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      openAuth("signup");
      return;
    }
    toggle({
      streamId: item.id,
      name: item.name,
      type: item.type,
      streamUrl: item.streamUrl,
      logo: item.logo,
      categoryId: item.categoryId,
    });
  };

  const handleClick = () => {
    if (item.type === "series") {
      openSeriesDetail({
        seriesId: Number(item.id),
        name: item.name,
        cover: item.logo,
        plot: item.plot,
      });
    } else {
      openPlayer({
        streamUrl: item.streamUrl,
        title: item.name,
        logo: item.logo,
        type: item.type,
        streamId: item.id,
        categoryId: item.categoryId,
      });
    }
  };

  const showImage = item.logo && !imgError;
  const isPortrait = item.type !== "live";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      className="group relative cursor-pointer overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-all duration-200 hover:border-primary/60 hover:shadow-lg hover:ring-1 hover:ring-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div
        className={cn(
          "relative w-full overflow-hidden bg-muted",
          isPortrait ? "aspect-[2/3]" : "aspect-video"
        )}
      >
        {showImage ? (
          <Image
            src={item.logo!}
            alt={item.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
            className="object-cover transition-transform duration-300 group-hover:scale-110"
            unoptimized
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-secondary">
            {item.type === "live" ? (
              <Tv className="h-10 w-10 text-muted-foreground/60" />
            ) : (
              <Film className="h-10 w-10 text-muted-foreground/60" />
            )}
          </div>
        )}

        {/* top badges */}
        <div className="absolute left-2 top-2 flex items-center gap-1">
          <TypeBadge type={item.type} />
        </div>

        {/* rating */}
        {item.rating ? (
          <div className="absolute right-2 top-2 flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-amber-300 backdrop-blur">
            <Star className="h-3 w-3 fill-amber-300" />
            {Number(item.rating).toFixed(1)}
          </div>
        ) : null}

        {/* hover overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 backdrop-blur-[2px] transition-opacity duration-200 group-hover:opacity-100">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-primary/30 transition-transform duration-200 group-hover:scale-110">
            <Play className="h-6 w-6 translate-x-0.5 fill-current" />
          </div>
        </div>

        {/* favorite button */}
        <button
          type="button"
          aria-label={fav ? "Remove from favorites" : "Add to favorites"}
          onClick={handleFavorite}
          className={cn(
            "absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white backdrop-blur transition-all hover:scale-110 hover:bg-black/80",
            fav ? "text-red-500" : "opacity-0 group-hover:opacity-100"
          )}
        >
          <Heart className={cn("h-4 w-4", fav && "fill-current")} />
        </button>
      </div>

      <div className="p-2">
        <h3
          className="line-clamp-2 text-xs font-medium leading-tight text-foreground sm:text-sm"
          title={item.name}
        >
          {item.name}
        </h3>
      </div>
    </div>
  );
}
