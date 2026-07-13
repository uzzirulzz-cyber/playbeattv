import { db } from "@/lib/db";

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
