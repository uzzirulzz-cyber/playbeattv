import { NextRequest, NextResponse } from "next/server";
import { getActivePlaylist } from "@/lib/playlist";
import { requireUser } from "@/lib/session";
import {
  authenticateXtream,
  getLiveCategories,
  getLiveStreams,
  getVodCategories,
  getVodStreams,
  getSeriesCategories,
  getSeries,
  getSeriesInfo,
  getVodInfo,
} from "@/lib/xtream";
import { FREE_CONTENT_FRACTION } from "@/lib/plans";

export const dynamic = "force-dynamic";

function hasActivePlan(
  plan: string | undefined,
  planExpires: string | null | undefined
): boolean {
  if (!plan || plan === "free") return false;
  if (!planExpires) return false;
  return new Date(planExpires).getTime() > Date.now();
}

/** Truncate an array to a fraction of its length (deterministic, every Nth item). */
function gateContent<T>(items: T[], fraction: number): T[] {
  if (fraction >= 1) return items;
  const keepCount = Math.max(1, Math.ceil(items.length * fraction));
  // Keep evenly distributed items so the preview looks representative.
  if (items.length <= keepCount) return items;
  const step = items.length / keepCount;
  const result: T[] = [];
  for (let i = 0; i < keepCount; i++) {
    result.push(items[Math.floor(i * step)]);
  }
  return result;
}

export async function GET(req: NextRequest) {
  // Auth gate — only signed-in users can browse content.
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const playlist = await getActivePlaylist();
  if (!playlist) {
    return NextResponse.json(
      { error: "No active playlist configured." },
      { status: 404 }
    );
  }

  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") || "auth";
  const categoryId = searchParams.get("category_id") || undefined;
  const seriesId = searchParams.get("series_id");
  const vodId = searchParams.get("vod_id");

  const { dns, username, password } = playlist;
  const isMember = hasActivePlan(user.plan, user.planExpires);

  try {
    switch (action) {
      case "auth":
        return NextResponse.json(
          await authenticateXtream(dns, username, password)
        );
      case "live_categories":
        return NextResponse.json(
          await getLiveCategories(dns, username, password)
        );
      case "live_streams": {
        const streams = await getLiveStreams(dns, username, password, categoryId);
        return NextResponse.json(
          isMember ? streams : gateContent(streams, FREE_CONTENT_FRACTION)
        );
      }
      case "vod_categories":
        return NextResponse.json(
          await getVodCategories(dns, username, password)
        );
      case "vod_streams": {
        const streams = await getVodStreams(dns, username, password, categoryId);
        return NextResponse.json(
          isMember ? streams : gateContent(streams, FREE_CONTENT_FRACTION)
        );
      }
      case "vod_info":
        if (!vodId)
          return NextResponse.json(
            { error: "vod_id required" },
            { status: 400 }
          );
        return NextResponse.json(
          await getVodInfo(dns, username, password, Number(vodId))
        );
      case "series_categories":
        return NextResponse.json(
          await getSeriesCategories(dns, username, password)
        );
      case "series": {
        const series = await getSeries(dns, username, password, categoryId);
        return NextResponse.json(
          isMember ? series : gateContent(series, FREE_CONTENT_FRACTION)
        );
      }
      case "series_info":
        if (!seriesId)
          return NextResponse.json(
            { error: "series_id required" },
            { status: 400 }
          );
        return NextResponse.json(
          await getSeriesInfo(dns, username, password, Number(seriesId))
        );
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Xtream request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
