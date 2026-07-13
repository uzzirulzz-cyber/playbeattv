import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActivePlaylist } from "@/lib/playlist";

export const dynamic = "force-dynamic";

// GET /api/history -> recent watch history for active playlist
export async function GET() {
  const playlist = await getActivePlaylist();
  if (!playlist) return NextResponse.json([]);
  const history = await db.history.findMany({
    where: { playlistId: playlist.id },
    orderBy: { watchedAt: "desc" },
    take: 60,
  });
  return NextResponse.json(history);
}

// POST /api/history { streamId, name, type, logo?, streamUrl, progress?, duration? }
export async function POST(req: NextRequest) {
  const playlist = await getActivePlaylist();
  if (!playlist) {
    return NextResponse.json({ error: "No active playlist" }, { status: 404 });
  }
  const body = await req.json().catch(() => ({}));
  const { streamId, name, type, logo, streamUrl, progress, duration } = body as {
    streamId?: string;
    name?: string;
    type?: string;
    logo?: string;
    streamUrl?: string;
    progress?: number;
    duration?: number;
  };
  if (!streamId || !name || !type || !streamUrl) {
    return NextResponse.json(
      { error: "streamId, name, type and streamUrl are required" },
      { status: 400 }
    );
  }

  const record = await db.history.upsert({
    where: {
      streamId_type_playlistId: {
        streamId: String(streamId),
        type,
        playlistId: playlist.id,
      },
    },
    create: {
      streamId: String(streamId),
      name,
      type,
      logo: logo ?? null,
      streamUrl,
      progress: progress ?? 0,
      duration: duration ?? 0,
      playlistId: playlist.id,
    },
    update: {
      name,
      logo: logo ?? null,
      streamUrl,
      progress: progress ?? 0,
      duration: duration ?? 0,
      watchedAt: new Date(),
    },
  });
  return NextResponse.json(record);
}

// DELETE /api/history?id=...  (or all with ?all=1)
export async function DELETE(req: NextRequest) {
  const playlist = await getActivePlaylist();
  if (!playlist) {
    return NextResponse.json({ error: "No active playlist" }, { status: 404 });
  }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const all = searchParams.get("all");
  if (all) {
    await db.history.deleteMany({ where: { playlistId: playlist.id } });
    return NextResponse.json({ ok: true });
  }
  if (!id)
    return NextResponse.json({ error: "id required" }, { status: 400 });
  await db.history.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
