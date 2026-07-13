import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [
    totalUsers,
    admins,
    activeSubs,
    totalFavs,
    totalHistory,
    playlist,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { role: "admin" } }),
    db.subscription.count({ where: { status: "active" } }),
    db.favorite.count(),
    db.history.count(),
    db.playlist.findFirst({ where: { active: true } }),
  ]);

  const byPlan = await db.user.groupBy({
    by: ["plan"],
    _count: true,
  });

  return NextResponse.json({
    totalUsers,
    admins,
    activeSubs,
    totalFavs,
    totalHistory,
    backendStatus: playlist?.status ?? "unknown",
    byPlan,
  });
}
