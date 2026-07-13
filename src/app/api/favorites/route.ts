import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActivePlaylist } from "@/lib/playlist";

export const dynamic = "force-dynamic";

// GET /api/favorites -> list favorites for active playlist
export async function GET() {
  const playlist = await getActivePlaylist();
  if (!playlist) return NextResponse.json([]);
  const favs = await db.favorite.findMany({
    where: { playlistId: playlist.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(favs);
}

// POST /api/favorites { streamId, name, type, categoryId?, logo?, streamUrl }
export async function POST(req: NextRequest) {
  const playlist = await getActivePlaylist();
  if (!playlist) {
    return NextResponse.json({ error: "No active playlist" }, { status: 404 });
  }
  const body = await req.json().catch(() => ({}));
  const { streamId, name, type, categoryId, logo, streamUrl } = body as {
    streamId?: string;
    name?: string;
    type?: string;
    categoryId?: string;
    logo?: string;
    streamUrl?: string;
  };
  if (!streamId || !name || !type || !streamUrl) {
    return NextResponse.json(
      { error: "streamId, name, type and streamUrl are required" },
      { status: 400 }
    );
  }

  const existing = await db.favorite.findUnique({
    where: {
      streamId_type_playlistId: {
        streamId: String(streamId),
        type,
        playlistId: playlist.id,
      },
    },
  });
  if (existing) return NextResponse.json(existing);

  const fav = await db.favorite.create({
    data: {
      streamId: String(streamId),
      name,
      type,
      categoryId: categoryId ?? null,
      logo: logo ?? null,
      streamUrl,
      playlistId: playlist.id,
    },
  });
  return NextResponse.json(fav);
}

// DELETE /api/favorites?streamId=X&type=Y  OR  ?id=Z
export async function DELETE(req: NextRequest) {
  const playlist = await getActivePlaylist();
  if (!playlist) {
    return NextResponse.json({ error: "No active playlist" }, { status: 404 });
  }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const streamId = searchParams.get("streamId");
  const type = searchParams.get("type");

  if (id) {
    await db.favorite.delete({ where: { id } });
  } else if (streamId && type) {
    await db.favorite.deleteMany({
      where: { streamId: String(streamId), type, playlistId: playlist.id },
    });
  } else {
    return NextResponse.json(
      { error: "id or (streamId and type) required" },
      { status: 400 }
    );
  }
  return NextResponse.json({ ok: true });
}
