"use client";

import { LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { Skeleton } from "@/components/ui/skeleton";

export interface Category {
  category_id: string;
  category_name: string;
}

interface CategoryRailProps {
  categories: Category[];
  loading?: boolean;
  counts?: Record<string, number>;
}

export function CategoryRail({
  categories,
  loading,
  counts,
}: CategoryRailProps) {
  const selected = useAppStore((s) => s.selectedCategoryId);
  const setSelected = useAppStore((s) => s.setSelectedCategoryId);

  if (loading) {
    return (
      <div className="flex gap-2 overflow-hidden">
        <Skeleton className="h-9 w-24 rounded-full" />
        <Skeleton className="h-9 w-32 rounded-full" />
        <Skeleton className="h-9 w-20 rounded-full" />
        <Skeleton className="h-9 w-28 rounded-full" />
      </div>
    );
  }

  return (
    <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      <button
        type="button"
        onClick={() => setSelected("all")}
        className={cn(
          "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
          selected === "all"
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
        )}
      >
        <LayoutGrid className="h-4 w-4" />
        All
      </button>
      {categories.map((c) => {
        const active = selected === c.category_id;
        const count = counts?.[c.category_id];
        return (
          <button
            key={c.category_id}
            type="button"
            onClick={() => setSelected(c.category_id)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
            )}
          >
            <span className="max-w-[200px] truncate">{c.category_name}</span>
            {count != null ? (
              <span
                className={cn(
                  "rounded-full px-1.5 text-[10px] font-semibold",
                  active
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
