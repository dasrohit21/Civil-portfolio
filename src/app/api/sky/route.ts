import { geolocation } from "@vercel/functions";
import { HOME, weatherAt } from "@/lib/weather";

/** A latitude or longitude rounded to about 10 km: plenty for weather, and kinder to privacy. */
const coord = (v: unknown, max: number) => {
  const n = Number(v);
  return v != null && v !== "" && Number.isFinite(n) && Math.abs(n) <= max ? Math.round(n * 10) / 10 : null;
};

/**
 * The weather and the roof's solar output where the visitor is: from ?lat=&lon= when they share
 * their location, else from their network (Vercel's geolocation headers), else Jamshedpur.
 * ?place=home always asks for Jamshedpur. `null` when the weather service is down.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  if (params.get("place") !== "home") {
    const lat = coord(params.get("lat"), 90);
    const lon = coord(params.get("lon"), 180);
    if (lat !== null && lon !== null) return Response.json(await weatherAt(`${lat},${lon}`, "exact"));
    const geo = geolocation(request);
    const near = { lat: coord(geo.latitude, 90), lon: coord(geo.longitude, 180) };
    if (near.lat !== null && near.lon !== null) {
      const live = await weatherAt(`${near.lat},${near.lon}`, "near");
      if (live) return Response.json(live);
    }
  }
  return Response.json(await weatherAt(HOME, "home"));
}
