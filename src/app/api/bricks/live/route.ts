import { realtimeConfigured, sealWall } from "@/lib/realtime";

/** The wall as sealed live queries. POST so the sealed tokens are never cached or logged in a URL. */
export async function POST() {
  if (!realtimeConfigured()) return Response.json({ error: "Live updates aren't set up." }, { status: 503 });
  return Response.json(await sealWall(), { headers: { "Cache-Control": "no-store" } });
}
