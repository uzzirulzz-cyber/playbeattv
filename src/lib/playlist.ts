import { db, withRetry } from "@/lib/db";

/** The shared, admin-managed IPTV backend. Hidden from regular users. */
export async function getActivePlaylist() {
  try {
    let playlist = await withRetry(() =>
      db.playlist.findFirst({ where: { active: true } })
    );
    if (!playlist) {
      playlist = await withRetry(() =>
        db.playlist.findFirst({ orderBy: { createdAt: "asc" } })
      );
      if (playlist) {
        await withRetry(() =>
          db.playlist.update({
            where: { id: playlist.id },
            data: { active: true },
          })
        );
      } else {
        // Auto-seed the default playlist if the database is empty.
        playlist = await withRetry(() =>
          db.playlist.create({
            data: {
              name: "PlayBeat Backend",
              dns: "http://njqqh.mor-esp.cc",
              username: "FHHNUEH",
              password: "2HSJRV6",
              active: true,
            },
          })
        );
      }
    }
    return playlist;
  } catch (err) {
    console.error("getActivePlaylist error:", err);
    return null;
  }
}

/** Seed the default IPTV backend once (admin-only concept). */
export async function ensureDefaultPlaylist() {
  try {
    const count = await withRetry(() => db.playlist.count());
    if (count === 0) {
      const playlist = await withRetry(() =>
        db.playlist.create({
          data: {
            name: "PlayBeat Backend",
            dns: "http://njqqh.mor-esp.cc",
            username: "FHHNUEH",
            password: "2HSJRV6",
            active: true,
          },
        })
      );
      return playlist;
    }

    const active = await withRetry(() =>
      db.playlist.findFirst({ where: { active: true } })
    );
    if (!active) {
      const first = await withRetry(() =>
        db.playlist.findFirst({ orderBy: { createdAt: "asc" } })
      );
      if (first) {
        await withRetry(() =>
          db.playlist.update({
            where: { id: first.id },
            data: { active: true },
          })
        );
      }
    }
    return await withRetry(() =>
      db.playlist.findFirst({ where: { active: true } })
    );
  } catch (err) {
    console.error("ensureDefaultPlaylist error:", err);
    return null;
  }
}
