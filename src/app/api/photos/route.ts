import { connection } from "next/server";
import { hotspotById } from "@/content/building";
import type { HotspotId, Photo } from "@/content/types";
import { dbConfigured, listPhotos } from "@/lib/db";
import { fileUrl, storageConfigured } from "@/lib/storage";

/** A chapter's photos, with links that last an hour: GET /api/photos?part=solar */
export async function GET(request: Request) {
  await connection();
  const part = new URL(request.url).searchParams.get("part") as HotspotId;
  if (!hotspotById(part)) return Response.json({ error: "Unknown chapter." }, { status: 400 });
  if (!dbConfigured() || !storageConfigured()) return Response.json([]);
  const rows = await listPhotos(part);
  const photos: Photo[] = await Promise.all(rows.map(async (r) => ({ id: r.id, part: r.part, caption: r.caption, url: await fileUrl(r.key) })));
  return Response.json(photos, { headers: { "Cache-Control": "private, max-age=600" } });
}
