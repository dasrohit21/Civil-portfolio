import * as THREE from "three";
import { moonAt, sunAt, type Period } from "@/lib/sky";
import type { Live, WeatherKind } from "@/content/types";
import { CAMERA } from "./model";

/** Soni's Jamshedpur: the sky's place until the visitor's own arrives. */
const HOME = { lat: 22.8, lon: 86.18 };
/** The look the paper sketch rises into: golden hour, as the site was first drawn. */
const GOLDEN = 5;

/**
 * How the sky and its light look with the sun at a given height (degrees). Between two of
 * these the colours blend, so dawn and dusk pass through blue hour and golden hour.
 */
type Key = {
  at: number;
  top: string; middle: string; horizon: string; glow: string;
  cloudedTop: string; cloudedHorizon: string;
  light: string; lightI: number;
  hemi: string; ground: string; hemiI: number;
  fill: string; fillI: number;
  cloudLit: string; cloudShade: string;
};
const KEYS: Key[] = [
  { at: -18, top: "#060c20", middle: "#0c1736", horizon: "#18244a", glow: "#25365f", cloudedTop: "#14181f", cloudedHorizon: "#262b35", light: "#9db2e6", lightI: 0.9, hemi: "#3a4f86", ground: "#1d2318", hemiI: 0.5, fill: "#6f86c8", fillI: 0.35, cloudLit: "#3a4568", cloudShade: "#141a2c" },
  { at: -7, top: "#17244e", middle: "#38497e", horizon: "#7e78a0", glow: "#e39a7e", cloudedTop: "#3a3f4b", cloudedHorizon: "#6a6870", light: "#a9b8e0", lightI: 1.0, hemi: "#5a6aa0", ground: "#2b3324", hemiI: 0.5, fill: "#7f95d6", fillI: 0.4, cloudLit: "#8d7f9e", cloudShade: "#2d3352" },
  { at: -1.5, top: "#3c5690", middle: "#c4888f", horizon: "#f3a47f", glow: "#ffcb94", cloudedTop: "#535a68", cloudedHorizon: "#a19a98", light: "#ff9a5c", lightI: 1.6, hemi: "#e8a888", ground: "#4d5638", hemiI: 0.5, fill: "#9db4ff", fillI: 0.5, cloudLit: "#f2a58f", cloudShade: "#6f5a78" },
  { at: GOLDEN, top: "#5f7fb4", middle: "#f2b48c", horizon: "#ffd9a6", glow: "#fff0c8", cloudedTop: "#5d6673", cloudedHorizon: "#b9b6b1", light: "#ffb46b", lightI: 3.2, hemi: "#ffd8b0", ground: "#6b7a4c", hemiI: 0.55, fill: "#9db4ff", fillI: 0.6, cloudLit: "#ffe3c6", cloudShade: "#b98f8a" },
  { at: 15, top: "#5a8bc9", middle: "#a6c6e6", horizon: "#f1e3c8", glow: "#fff6dc", cloudedTop: "#67717e", cloudedHorizon: "#c0c0bc", light: "#ffd9a8", lightI: 3.2, hemi: "#ece4d2", ground: "#6b7a4c", hemiI: 0.6, fill: "#b9c9ff", fillI: 0.6, cloudLit: "#fff7ec", cloudShade: "#b7bccb" },
  { at: 35, top: "#3f7cc4", middle: "#8dbae6", horizon: "#d9e7f0", glow: "#ffffff", cloudedTop: "#6d7784", cloudedHorizon: "#c6cacd", light: "#fff3e2", lightI: 3.0, hemi: "#dfe9f5", ground: "#6f7d4e", hemiI: 0.65, fill: "#c4d4ff", fillI: 0.55, cloudLit: "#ffffff", cloudShade: "#c2c9d6" },
];
const COLOR_KEYS = ["top", "middle", "horizon", "glow", "cloudedTop", "cloudedHorizon", "light", "hemi", "ground", "fill", "cloudLit", "cloudShade"] as const;
type ColorKey = (typeof COLOR_KEYS)[number];
const PALETTES = KEYS.map((k) => Object.fromEntries(COLOR_KEYS.map((c) => [c, new THREE.Color(k[c])])) as Record<ColorKey, THREE.Color>);

/** How cloudy each kind of weather looks at least, whatever the cloud-cover figure says. */
const MIN_COVER: Record<WeatherKind, number> = { clear: 0.12, cloudy: 0.5, overcast: 0.85, fog: 0.6, rain: 0.9, storm: 0.95, snow: 0.9 };

const UP = new THREE.Vector3(0, 1, 0);
const v3 = (a: readonly number[]) => new THREE.Vector3(a[0], a[1], a[2]);
/** Looking from the overview, level: the way the sky behind the city faces, and its right. */
const AHEAD = v3(CAMERA.built.target).sub(v3(CAMERA.built.position)).setY(0).normalize();
const RIGHT = AHEAD.clone().cross(UP).normalize();
/** Towards the camera, level: the side the light comes from, so the front of the building is lit. */
const FRONT = AHEAD.clone().negate();

/**
 * The sky's horizon sits below the camera's, where the land ends behind the city: the overview
 * looks down, so this is the band of sky it sees. Sun, moon and clouds live in that band.
 */
export const SKY_DROP = Math.sin(8 * THREE.MathUtils.DEG2RAD);
/** How far round the band the sun travels, sunrise (right) to sunset (left), in degrees. */
const SPAN = 26;

/** A direction in the sky band: `across` -1 (right) .. 1 (left), `up` in degrees above its horizon. */
function bandDirection(across: number, up: number, out: THREE.Vector3) {
  const yaw = (-across * SPAN) / 2;
  const el = (up - 8) * THREE.MathUtils.DEG2RAD;
  const y = yaw * THREE.MathUtils.DEG2RAD;
  return out
    .copy(AHEAD)
    .multiplyScalar(Math.cos(y))
    .addScaledVector(RIGHT, Math.sin(y))
    .multiplyScalar(Math.cos(el))
    .addScaledVector(UP, Math.sin(el))
    .normalize();
}

/** The light falls from the front: from the right in the morning, overhead at noon, the left at dusk. */
function lightDirection(across: number, up: number, out: THREE.Vector3) {
  const a = across * 80 * THREE.MathUtils.DEG2RAD;
  const el = up * THREE.MathUtils.DEG2RAD;
  return out
    .copy(FRONT)
    .multiplyScalar(Math.cos(a))
    .addScaledVector(RIGHT, -Math.sin(a))
    .multiplyScalar(Math.cos(el))
    .addScaledVector(UP, Math.sin(el))
    .normalize();
}

/**
 * The sky right now, eased every frame by the Rig towards the visitor's clock and weather, and
 * read by the sky dome, the lights and the building's windows.
 */
export const daylight = {
  /** The sun's height the scene shows, in degrees (eased). */
  elevation: GOLDEN,
  /** Where the sun is along its day and the moon along the night, -1..1 (eased). */
  sunArc: 0.85,
  moonArc: -1,
  period: "evening" as Period,
  /** 0 by day .. 1 at night: stars, the moon, lit windows and street lamps. */
  night: 0,
  /** Cloud cover the sky shows, 0..1, and how far the wind has carried the clouds. */
  cover: 0.12,
  drift: new THREE.Vector2(),
  moonAge: 0.5,
  /** -1 in the southern hemisphere, where the moon is lit from the other side. */
  moonFlip: 1,
  sunDir: bandDirection(0.85, 1, new THREE.Vector3()),
  moonDir: bandDirection(-1, 0, new THREE.Vector3()),
  lightDir: lightDirection(0.85, 21, new THREE.Vector3()),
  sunShow: 1,
  moonShow: 0,
  palette: Object.fromEntries(COLOR_KEYS.map((c) => [c, PALETTES[3][c].clone()])) as Record<ColorKey, THREE.Color>,
  lightI: KEYS[3].lightI,
  hemiI: KEYS[3].hemiI,
  fillI: KEYS[3].fillI,
};

function blendPalette(elevation: number) {
  let i = 0;
  while (i < KEYS.length - 2 && elevation > KEYS[i + 1].at) i++;
  const a = KEYS[i], b = KEYS[i + 1];
  const k = THREE.MathUtils.clamp((elevation - a.at) / (b.at - a.at), 0, 1);
  for (const c of COLOR_KEYS) daylight.palette[c].lerpColors(PALETTES[i][c], PALETTES[i + 1][c], k);
  daylight.lightI = THREE.MathUtils.lerp(a.lightI, b.lightI, k);
  daylight.hemiI = THREE.MathUtils.lerp(a.hemiI, b.hemiI, k);
  daylight.fillI = THREE.MathUtils.lerp(a.fillI, b.fillI, k);
}

const sunLight = new THREE.Vector3();
const moonLight = new THREE.Vector3();

/**
 * Move the sky on: `rise` is how far the building has risen out of the paper (0..1); until it
 * has, the sky stays at the golden hour it was drawn in.
 */
export function updateDaylight(dt: number, live: Live | null, rise: number, reducedMotion: boolean, preview: Period | null) {
  const place = live?.place ?? HOME;
  const now = Date.now();
  const sun = sunAt(now, place.lat, place.lon, preview);
  const moon = live?.moon != null ? { age: live.moon, lit: (1 - Math.cos(2 * Math.PI * live.moon)) / 2 } : moonAt(now);
  daylight.period = sun.period;
  daylight.moonAge = moon.age;
  daylight.moonFlip = place.lat < 0 ? -1 : 1;

  const target = THREE.MathUtils.lerp(GOLDEN, sun.elevation, rise);
  daylight.elevation = THREE.MathUtils.damp(daylight.elevation, target, 1.5, dt);
  // The sun crosses the band by day and the moon by night; off duty, each waits just out of the
  // band on the side it will come back from (or went out on), so neither sweeps across the sky.
  const a = sun.arc;
  const sunArc = THREE.MathUtils.lerp(0.85, a <= 1.1 ? a : a < 2 ? 1.1 : -1.1, rise);
  const moonArc = a > 1 ? a - 2 : a < 0 ? 1.1 : -1.1;
  daylight.sunArc = THREE.MathUtils.damp(daylight.sunArc, sunArc, 1.5, dt);
  daylight.moonArc = THREE.MathUtils.damp(daylight.moonArc, moonArc, 1.5, dt);
  blendPalette(daylight.elevation);

  const e = daylight.elevation;
  daylight.night = THREE.MathUtils.smoothstep(-e, -4, 8);
  // Low in the band near sunrise and sunset, highest at noon; it sinks out of sight below the horizon.
  const high = Math.max(sun.noon, 10);
  const sunUp = e >= 0 ? 1.5 + 7 * Math.pow(Math.min(1, e / high), 0.5) : 1.5 + e * 0.6;
  bandDirection(daylight.sunArc, sunUp, daylight.sunDir);
  daylight.sunShow = THREE.MathUtils.smoothstep(e, -3, 0);
  const m = daylight.moonArc;
  bandDirection(m, 1.2 + 6.3 * Math.sqrt(Math.max(0, 1 - m * m)), daylight.moonDir);
  daylight.moonShow = daylight.night * THREE.MathUtils.smoothstep(1 - Math.abs(m), 0, 0.15) * (0.25 + 0.75 * moon.lit);

  // By day the sun lights the scene; by night the moon does, more faintly.
  lightDirection(THREE.MathUtils.clamp(daylight.sunArc, -1, 1), 18 + 0.6 * Math.max(0, e), sunLight);
  lightDirection(THREE.MathUtils.clamp(m, -1, 1), 30 + 25 * Math.sqrt(Math.max(0, 1 - m * m)), moonLight);
  daylight.lightDir.lerpVectors(sunLight, moonLight, daylight.night).normalize();

  const kind = live?.kind ?? "clear";
  const cover = Math.max((live?.cloud ?? 0) / 100, MIN_COVER[rise > 0.5 ? kind : "clear"]);
  daylight.cover = THREE.MathUtils.damp(daylight.cover, cover, 1, dt);
  if (!reducedMotion) daylight.drift.x += dt * (0.004 + (live?.windKph ?? 8) * 0.0006);
}
