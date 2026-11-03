/**
 * Where the sun is, and how much of the moon shows, for a place and a moment. Plain maths (the
 * NOAA approximations, good to a fraction of a degree), so the sky moves with the clock between
 * weather readings and needs no other service.
 */

export type Period = "morning" | "afternoon" | "evening" | "night";
export const PERIODS: Period[] = ["morning", "afternoon", "evening", "night"];

export type SunNow = {
  /** Height of the sun above the horizon, in degrees (negative below it). */
  elevation: number;
  /** -1 at sunrise, 0 at noon, 1 at sunset, and on round to 3 at the next sunrise. */
  arc: number;
  /** Highest the sun gets today, in degrees. */
  noon: number;
  period: Period;
};

const RAD = Math.PI / 180;
const SYNODIC_DAYS = 29.530588853;
/** A new moon: 6 January 2000, 18:14 UTC. */
const NEW_MOON = Date.UTC(2000, 0, 6, 18, 14);

/**
 * `?time=morning` (or afternoon, evening, night) previews that part of the day over the real
 * clock, the way `?weather=` previews the weather.
 */
export function previewPeriod(): Period | null {
  if (typeof window === "undefined") return null;
  const p = new URLSearchParams(window.location.search).get("time") as Period | null;
  return p && PERIODS.includes(p) ? p : null;
}

export function sunAt(ms: number, lat: number, lon: number, preview: Period | null = null): SunNow {
  const d = ms / 86400000 - 10957.5; // days since noon, 1 January 2000 (UTC)
  const g = (357.529 + 0.98560028 * d) * RAD;
  const q = 280.459 + 0.98564736 * d;
  const L = (q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * RAD;
  const e = (23.439 - 0.00000036 * d) * RAD;
  const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L)) / RAD;
  const dec = Math.asin(Math.sin(e) * Math.sin(L));
  const gmst = 18.697374558 + 24.06570982441908 * d;
  const phi = lat * RAD;

  // Half the day, as an hour angle: sunrise and sunset (with refraction) are at ∓h0.
  const cosH0 = (Math.sin(-0.833 * RAD) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec));
  const h0 = Math.acos(Math.min(1, Math.max(-1, cosH0))) / RAD;

  let h = (((gmst * 15 + lon - ra) % 360) + 540) % 360 - 180; // -180..180, 0 at noon
  if (preview === "morning") h = -h0 + 22;
  else if (preview === "afternoon") h = Math.min(35, h0 - 30);
  else if (preview === "evening") h = h0 - 4;
  else if (preview === "night") h = 180;

  const elevation = Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(h * RAD)) / RAD;
  // Through the day the arc runs -1..1; through the night it carries on 1..3.
  const night = 360 - 2 * h0;
  const arc = Math.abs(h) <= h0 ? h / Math.max(h0, 1) : 1 + (2 * (((h - h0 + 360) % 360) || 0)) / Math.max(night, 1);
  return { elevation, arc, noon: 90 - Math.abs(lat - dec / RAD), period: periodOf(elevation, h) };
}

function periodOf(elevation: number, h: number): Period {
  if (elevation < -6) return "night";
  if (h < 0) return "morning";
  return elevation >= 12 ? "afternoon" : "evening";
}

/** The moon's age through its month (0 new, 0.5 full) and how much of it is lit (0..1). */
export function moonAt(ms: number) {
  const age = ((((ms - NEW_MOON) / 86400000 / SYNODIC_DAYS) % 1) + 1) % 1;
  return { age, lit: (1 - Math.cos(2 * Math.PI * age)) / 2 };
}

/** The clock on the wall at that place: "6:42 pm". */
export function clockAt(ms: number, tz: string) {
  try {
    return new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: tz }).format(ms).toLowerCase();
  } catch {
    return "";
  }
}
