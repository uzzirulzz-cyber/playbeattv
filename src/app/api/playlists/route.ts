import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticateXtream, ensureDefaultPlaylist } from "@/lib/xtream";

export const dynamic = "force-dynamic";

// GET /api/playlists  -> { playlists, active }
export async function GET() {
  await ensureDefaultPlaylist();
  const playlists = await db.playlist.findMany({
    orderBy: { createdAt: "asc" },
  });
  const active = playlists.find((p) => p.active) ?? playlists[0] ?? null;
  return NextResponse.json({ playlists, active });
}

// POST /api/playlists  -> create { name, dns, username, password, setActive? }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { name, dns, username, password, setActive } = body as {
    name?: string;
    dns?: string;
    username?: string;
    password?: string;
    setActive?: boolean;
  };

  if (!dns || !username || !password) {
    return NextResponse.json(
      { error: "dns, username and password are required" },
      { status: 400 }
    );
  }

  if (setActive) {
    await db.playlist.updateMany({ data: { active: false } });
  }

  const playlist = await db.playlist.create({
    data: {
      name: name?.trim() || "Untitled Playlist",
      dns: dns.trim(),
      username: username.trim(),
      password: password.trim(),
      active: !!setActive,
    },
  });

  return NextResponse.json({ playlist });
}

// PATCH /api/playlists  -> set active { id }
export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { id } = body as { id?: string };
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  await db.playlist.updateMany({ data: { active: false } });
  const playlist = await db.playlist.update({
    where: { id },
    data: { active: true },
  });
  return NextResponse.json({ playlist });
}

// DELETE /api/playlists?id=...
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  await db.playlist.delete({ where: { id } });
  // re-activate the first remaining if needed
  const remaining = await db.playlist.findFirst({ orderBy: { createdAt: "asc" } });
  if (remaining && !remaining.active) {
    await db.playlist.update({
      where: { id: remaining.id },
      data: { active: true },
    });
  }
  return NextResponse.json({ ok: true });
}
