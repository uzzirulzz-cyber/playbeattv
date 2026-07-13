import { db } from "@/lib/db";

/** The shared, admin-managed IPTV backend. Hidden from regular users. */
export async function getActivePlaylist() {
  let playlist = await db.playlist.findFirst({ where: { active: true } });
  if (!playlist) {
    playlist = await db.playlist.findFirst({ orderBy: { createdAt: "asc" } });
    if (playlist) {
      await db.playlist.update({
        where: { id: playlist.id },
        data: { active: true },
      });
    }
  }
  return playlist;
}

/** Seed the default IPTV backend once (admin-only concept). */
export async function ensureDefaultPlaylist() {
  const count = await db.playlist.count();
  if (count === 0) {
    const playlist = await db.playlist.create({
      data: {
        name: "PlayBeat Backend",
        dns: "http://njqqh.mor-esp.cc",
        username: "FHHNUEH",
        password: "2HSJRV6",
        active: true,
      },
    });
    return playlist;
  }

  const active = await db.playlist.findFirst({ where: { active: true } });
  if (!active) {
    const first = await db.playlist.findFirst({ orderBy: { createdAt: "asc" } });
    if (first) {
      await db.playlist.update({
        where: { id: first.id },
        data: { active: true },
      });
    }
  }
  return await db.playlist.findFirst({ where: { active: true } });
}
