import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActivePlaylist } from "@/lib/playlist";
import { authenticateXtream } from "@/lib/xtream";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// The bot handler runs every 30s (pinged by a cron/keep-alive service).
// It performs health checks, syncs payment status, and prunes expired sessions.

export async function GET(req: NextRequest) {
  // Verify the bot secret (prevents external abuse).
  const auth = req.headers.get("authorization");
  const secret = process.env.BOT_HANDLER_SECRET;
  if (secret && auth !== `Bearer ${secret}`) {
    const q = new URL(req.url).searchParams.get("secret");
    if (q !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const results: Record<string, unknown> = {};
  const startedAt = Date.now();

  // 1. Check the IPTV backend health.
  try {
    const playlist = await getActivePlaylist();
    if (playlist) {
      const info = await authenticateXtream(
        playlist.dns,
        playlist.username,
        playlist.password
      );
      const userInfo = info.user_info;
      const status =
        userInfo?.status === "Active" || userInfo?.auth === 1
          ? "online"
          : "offline";
      if (status !== playlist.status) {
        await db.playlist.update({
          where: { id: playlist.id },
          data: { status },
        });
      }
      results.backend = status;
    } else {
      results.backend = "not_configured";
    }
  } catch (e) {
    results.backend = "error";
    results.backendError = e instanceof Error ? e.message : "unknown";
  }

  // 2. Expire subscriptions past their end date.
  try {
    const expired = await db.subscription.updateMany({
      where: {
        status: "active",
        endAt: { lt: new Date() },
      },
      data: { status: "expired" },
    });
    results.expiredSubs = expired.count;

    // Downgrade users whose plan has expired.
    const usersToDowngrade = await db.user.findMany({
      where: {
        plan: { not: "free" },
        planExpires: { lt: new Date() },
      },
      select: { id: true },
    });
    if (usersToDowngrade.length > 0) {
      await db.user.updateMany({
        where: { id: { in: usersToDowngrade.map((u) => u.id) } },
        data: { plan: "free", planExpires: null },
      });
    }
    results.downgradedUsers = usersToDowngrade.length;
  } catch (e) {
    results.expireError = e instanceof Error ? e.message : "unknown";
  }

  // 3. Clean up old pending payments (> 24h old).
  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const stale = await db.payment.updateMany({
      where: {
        status: "pending",
        createdAt: { lt: cutoff },
      },
      data: { status: "failed" },
    });
    results.stalePayments = stale.count;
  } catch (e) {
    results.cleanupError = e instanceof Error ? e.message : "unknown";
  }

  // 4. Gather quick stats.
  try {
    const [users, activeSubs, pendingPayments] = await Promise.all([
      db.user.count(),
      db.subscription.count({ where: { status: "active" } }),
      db.payment.count({ where: { status: "pending" } }),
    ]);
    results.stats = { users, activeSubs, pendingPayments };
  } catch (e) {
    results.statsError = e instanceof Error ? e.message : "unknown";
  }

  results.durationMs = Date.now() - startedAt;
  results.nextRunIn = "30s";

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    ...results,
  });
}

// Also support POST for cron services that use POST.
export async function POST(req: NextRequest) {
  return GET(req);
}
