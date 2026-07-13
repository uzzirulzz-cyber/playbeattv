"use client";

import { useEffect, useRef } from "react";
import { ADSENSE_CLIENT } from "@/lib/ads";

interface AdUnitProps {
  /** Ad slot ID created in your AdSense account (leave empty for auto/responsive). */
  slot?: string;
  format?: string;
  responsive?: boolean;
  layout?: string;
  layoutKey?: string;
  className?: string;
  style?: React.CSSProperties;
  label?: string;
}

/**
 * Renders a single Google AdSense ad unit (`<ins class="adsbygoogle">`).
 *
 * In development / on unverified domains the ad space stays empty and a subtle
 * "Advertisement" placeholder is shown so the layout always looks intentional.
 * Once the domain is approved in AdSense, real ads fill the container.
 */
export function AdUnit({
  slot,
  format = "auto",
  responsive = true,
  layout,
  layoutKey,
  className,
  style,
  label = "Advertisement",
}: AdUnitProps) {
  const pushedRef = useRef(false);

  useEffect(() => {
    if (pushedRef.current) return;
    pushedRef.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      /* AdSense script not loaded yet — harmless */
    }
  }, []);

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-muted/30 ${className ?? ""}`}
      style={style}
      aria-label="Advertisement"
    >
      <span className="pointer-events-none absolute left-2 top-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
        {label}
      </span>
      <ins
        className="adsbygoogle"
        style={{ display: "block", width: "100%", height: "100%" }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slot}
        data-ad-format={format}
        data-ad-layout={layout}
        data-ad-layout-key={layoutKey}
        data-full-width-responsive={responsive ? "true" : "false"}
      />
    </div>
  );
}
