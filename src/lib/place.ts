"use client";

import { useStore, type PlaceChoice } from "./store";

const KEY = "sky-place";

/** The visitor's position from the browser, if they allow it, rounded to about a kilometre. */
function locate(): Promise<{ lat: number; lon: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("This browser can't share its location."));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: Math.round(p.coords.latitude * 100) / 100, lon: Math.round(p.coords.longitude * 100) / 100 }),
      (e) => reject(new Error(e.code === e.PERMISSION_DENIED ? "Location is blocked for this site." : "Couldn't find your location.")),
      { maximumAge: 30 * 60 * 1000, timeout: 10000 },
    );
  });
}

/** Show the visitor's sky (from their network, or exactly) or Soni's, and remember it on this device. */
export async function choosePlace(place: PlaceChoice) {
  const coords = place === "exact" ? await locate() : null;
  try {
    localStorage.setItem(KEY, place);
  } catch {}
  useStore.getState().setPlace(place, coords);
}

/** On arrival: the choice made last time. If the location can't be had now, the network's will do. */
export function restorePlace() {
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(KEY);
  } catch {}
  if (saved === "home" || saved === "exact") choosePlace(saved).catch(() => {});
}
