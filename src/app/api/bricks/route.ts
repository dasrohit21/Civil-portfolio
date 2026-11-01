import { connection } from "next/server";
import type { Brick } from "@/content/types";
import { addBrick, allowVisitor, countBricks, dbConfigured, listBricks } from "@/lib/db";

/** Keep only plain text, without control characters or angle brackets, cut to `max`. */
const clean = (v: unknown, max: number) =>
  String(v ?? "")
    .replace(/[\u0000-\u001f\u007f<>]/g, "")
    .trim()
    .slice(0, max);

/** The wall: newest bricks first, and how many there are. */
export async function GET() {
  await connection(); // always read the wall fresh, never at build time
  if (!dbConfigured()) return Response.json({ configured: false, count: 0, bricks: [] });
  try {
    const [bricks, count] = await Promise.all([listBricks(), countBricks()]);
    return Response.json({ configured: true, count, bricks });
  } catch {
    return Response.json({ error: "The wall can't be read right now." }, { status: 502 });
  }
}

/** Lay a brick: { name, note }. */
export async function POST(request: Request) {
  if (!dbConfigured()) return Response.json({ error: "The wall isn't open yet." }, { status: 503 });
  const body = await request.json().catch(() => null);
  const name = clean(body?.name, 40);
  const note = clean(body?.note, 80);
  if (!name) return Response.json({ error: "Write your name on the brick." }, { status: 400 });

  const address = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  try {
    if (!(await allowVisitor(address))) return Response.json({ error: "That's plenty of bricks for now. Come back in an hour." }, { status: 429 });
    const brick: Brick = { name, note, at: Date.now() };
    await addBrick(brick);
    return Response.json({ brick, count: await countBricks() }, { status: 201 });
  } catch {
    return Response.json({ error: "The brick didn't stick. Try again in a moment." }, { status: 502 });
  }
}
