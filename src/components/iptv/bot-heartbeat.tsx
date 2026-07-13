"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";

/**
 * Pings the bot handler endpoint every 30 seconds while a user is signed in.
 * This keeps the backend health-checked, prunes expired subscriptions, and
 * downgrades users whose plans have expired.
 *
 * In production, also configure Vercel Cron (or equivalent) to ping
 * /api/bot?secret=... every 30s for background reliability.
 */
const BOT_INTERVAL_MS = 30 * 1000;
const BOT_SECRET = "playbeat-bot-2026";

export function BotHeartbeat() {
  const { isAuthenticated } = useAuth();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    const ping = async () => {
      try {
        await fetch(`/api/bot?secret=${BOT_SECRET}`, {
          method: "GET",
          cache: "no-store",
        });
      } catch {
        // Silent fail — heartbeat is best-effort.
      }
    };

    // Ping immediately, then every 30s.
    ping();
    timerRef.current = setInterval(ping, BOT_INTERVAL_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isAuthenticated]);

  return null;
}
