import { jamshedpurNow } from "@/lib/weather";

/** Jamshedpur right now: weather and the roof's solar output. `null` when the weather service is down. */
export async function GET() {
  return Response.json(await jamshedpurNow());
}
