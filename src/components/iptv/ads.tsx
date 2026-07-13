"use client";

import { AdUnit } from "@/components/iptv/ad-unit";

/** Responsive horizontal leaderboard banner. */
export function AdBanner({ className }: { className?: string }) {
  return (
    <div className={className}>
      <AdUnit
        format="horizontal"
        responsive
        className="min-h-[100px] w-full"
        label="Advertisement"
      />
    </div>
  );
}

/** Full-width in-feed ad slot, designed to live inside the content grid. */
export function AdInFeed() {
  return (
    <div className="col-span-full">
      <AdUnit
        format="fluid"
        layout="in-article"
        responsive
        className="min-h-[120px] w-full"
        label="Sponsored"
      />
    </div>
  );
}
