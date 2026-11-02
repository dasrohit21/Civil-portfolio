import { hotspotById } from "@/content/building";
import type { HotspotId } from "@/content/types";
import { denyUnlessOwner } from "@/lib/auth";
import { addPhoto, listPhotos } from "@/lib/db";
import { fileUrl, putFile, storageConfigured } from "@/lib/storage";

/** Vercel caps a request body at 4.5 MB. */
const MAX_BYTES = 4 * 1024 * 1024;
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/** Studio: every photo, with links. */
export async function GET() {
  const denied = await denyUnlessOwner();
  if (denied) return denied;
  const rows = await listPhotos();
  return Response.json(await Promise.all(rows.map(async (r) => ({ id: r.id, part: r.part, caption: r.caption, url: await fileUrl(r.key) }))));
}

/** Studio: upload a photo (form fields: file, part, caption) into a chapter. */
export async function POST(request: Request) {
  const denied = await denyUnlessOwner();
  if (denied) return denied;
  if (!storageConfigured()) return Response.json({ error: "Storage isn't set up." }, { status: 503 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const part = String(form?.get("part") ?? "") as HotspotId;
  const caption = String(form?.get("caption") ?? "").trim().slice(0, 120);
  if (!(file instanceof File) || !TYPES[file.type]) return Response.json({ error: "Choose a JPG, PNG or WebP image." }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: "Keep photos under 4 MB." }, { status: 413 });
  if (!hotspotById(part)) return Response.json({ error: "Pick a chapter for the photo." }, { status: 400 });

  // A new key per upload, so a cached link never shows an old file
  const key = `photos/${part}/${crypto.randomUUID()}.${TYPES[file.type]}`;
  await putFile(key, file);
  const row = await addPhoto(part, key, caption);
  return Response.json({ id: row.id, part, caption, url: await fileUrl(key) }, { status: 201 });
}
