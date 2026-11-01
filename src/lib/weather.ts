import { cacheLife } from "next/cache";
import type { Live, WeatherKind } from "@/content/types";

/**
 * Jamshedpur right now, from WeatherAPI.com. Server only: the key (WEATHER_API_KEY in .env.local)
 * never reaches the browser. /api/sky calls this, and the answer is cached for a few minutes so
 * every visitor doesn't use up a request.
 */
const PLACE = "Jamshedpur";

/** The model's roof: 12 panels of about 400 W. Output = tilted-panel radiation / 1000 W/m² × peak × 0.8 for losses. */
const SOLAR_PEAK_KW = 4.8;
const PERFORMANCE_RATIO = 0.8;

/** WeatherAPI condition codes → what the scene shows. https://www.weatherapi.com/docs/weather_conditions.json */
const STORM = [1087, 1273, 1276, 1279, 1282];
const SNOW = [1066, 1069, 1072, 1114, 1117, 1168, 1171, 1204, 1207, 1210, 1213, 1216, 1219, 1222, 1225, 1237, 1249, 1252, 1255, 1258, 1261, 1264];
const RAIN = [1063, 1150, 1153, 1180, 1183, 1186, 1189, 1192, 1195, 1198, 1201, 1240, 1243, 1246];
const FOG = [1030, 1135, 1147];

function kindOf(code: number, precipMm: number): WeatherKind {
  if (STORM.includes(code)) return "storm";
  if (SNOW.includes(code)) return "snow";
  // "Patchy rain nearby" (1063) only counts as rain here when some is actually falling.
  if (RAIN.includes(code) && (code !== 1063 || precipMm > 0)) return "rain";
  if (FOG.includes(code)) return "fog";
  if (code === 1009 || code === 1063) return "overcast";
  if (code === 1006) return "cloudy";
  return "clear";
}

export async function jamshedpurNow(): Promise<Live | null> {
  "use cache";
  cacheLife("minutes");
  const key = process.env.WEATHER_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(`https://api.weatherapi.com/v1/forecast.json?key=${key}&q=${PLACE}&days=1&aqi=no&alerts=no`);
    if (!res.ok) return null;
    const { current, forecast } = await res.json();
    const code = Number(current.condition.code);
    const precip = Number(current.precip_mm) || 0;
    const kind = kindOf(code, precip);
    const radiation = Number(current.gti ?? current.short_rad) || 0;
    const astro = forecast.forecastday[0].astro;
    return {
      tempC: Math.round(Number(current.temp_c)),
      weather: String(current.condition.text).trim(),
      kind,
      // A few mm an hour is heavy rain; drizzle still shows a little.
      intensity: kind === "rain" || kind === "storm" || kind === "snow" ? Math.min(1, Math.max(0.25, precip / 4)) : 0,
      isDay: current.is_day === 1,
      solarKw: Math.round((radiation / 1000) * SOLAR_PEAK_KW * PERFORMANCE_RATIO * 10) / 10,
      solarPeakKw: SOLAR_PEAK_KW,
      sunrise: astro.sunrise,
      sunset: astro.sunset,
    };
  } catch {
    return null;
  }
}
