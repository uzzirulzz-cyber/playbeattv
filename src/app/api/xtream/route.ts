import { NextRequest, NextResponse } from "next/server";
import { getActivePlaylist } from "@/lib/playlist";
import { getCurrentUser } from "@/lib/session";
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
  if (items.length <= keepCount) return items;
  const step = items.length / keepCount;
  const result: T[] = [];
  for (let i = 0; i < keepCount; i++) {
    result.push(items[Math.floor(i * step)]);
  }
  return result;
}

export async function GET(req: NextRequest) {
  // Allow guests (non-signed-in) to browse — treated as free users (10% content).
  const user = await getCurrentUser();
  const isMember = user
    ? hasActivePlan(user.plan, user.planExpires?.toISOString())
    : false;

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

  try {
    let response: NextResponse;
    switch (action) {
      case "auth":
        response = NextResponse.json(
          await authenticateXtream(dns, username, password)
        );
        break;
      case "live_categories":
        response = NextResponse.json(
          await getLiveCategories(dns, username, password)
        );
        break;
      case "live_streams": {
        const streams = await getLiveStreams(dns, username, password, categoryId);
        response = NextResponse.json(
          isMember ? streams : gateContent(streams, FREE_CONTENT_FRACTION)
        );
        break;
      }
      case "vod_categories":
        response = NextResponse.json(
          await getVodCategories(dns, username, password)
        );
        break;
      case "vod_streams": {
        const streams = await getVodStreams(dns, username, password, categoryId);
        response = NextResponse.json(
          isMember ? streams : gateContent(streams, FREE_CONTENT_FRACTION)
        );
        break;
      }
      case "vod_info":
        if (!vodId)
          return NextResponse.json(
            { error: "vod_id required" },
            { status: 400 }
          );
        response = NextResponse.json(
          await getVodInfo(dns, username, password, Number(vodId))
        );
        break;
      case "series_categories":
        response = NextResponse.json(
          await getSeriesCategories(dns, username, password)
        );
        break;
      case "series": {
        const series = await getSeries(dns, username, password, categoryId);
        response = NextResponse.json(
          isMember ? series : gateContent(series, FREE_CONTENT_FRACTION)
        );
        break;
      }
      case "series_info":
        if (!seriesId)
          return NextResponse.json(
            { error: "series_id required" },
            { status: 400 }
          );
        response = NextResponse.json(
          await getSeriesInfo(dns, username, password, Number(seriesId))
        );
        break;
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
    // Cache list responses in the browser for 5 minutes — BUT only for
    // non-gated responses (member). Guest responses (10% gated) must not be
    // cached at CDN level, otherwise members would get gated content and
    // vice versa. Use private cache for guests, public for members.
    if (["live_streams", "vod_streams", "series", "live_categories", "vod_categories", "series_categories"].includes(action)) {
      if (isMember) {
        response.headers.set("Cache-Control", "private, max-age=300, stale-while-revalidate=600");
      } else {
        // Guests get gated content — don't cache at CDN (would leak full list)
        response.headers.set("Cache-Control", "no-store");
      }
    }
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Xtream request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
