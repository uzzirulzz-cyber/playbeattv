import { NextRequest, NextResponse } from "next/server";
import { getActivePlaylist } from "@/lib/playlist";
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

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
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
    switch (action) {
      case "auth":
        return NextResponse.json(
          await authenticateXtream(dns, username, password)
        );
      case "live_categories":
        return NextResponse.json(
          await getLiveCategories(dns, username, password)
        );
      case "live_streams":
        return NextResponse.json(
          await getLiveStreams(dns, username, password, categoryId)
        );
      case "vod_categories":
        return NextResponse.json(
          await getVodCategories(dns, username, password)
        );
      case "vod_streams":
        return NextResponse.json(
          await getVodStreams(dns, username, password, categoryId)
        );
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
      case "series":
        return NextResponse.json(
          await getSeries(dns, username, password, categoryId)
        );
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
