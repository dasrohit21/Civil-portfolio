"use client";

import { useState, useSyncExternalStore } from "react";
import type { Live } from "@/content/types";
import { choosePlace } from "@/lib/place";
import { clockAt, previewPeriod, sunAt, type Period } from "@/lib/sky";
import { useStore } from "@/lib/store";

const PERIOD: Record<Period, { icon: string; label: string }> = {
  morning: { icon: "🌅", label: "Morning" },
  afternoon: { icon: "☀️", label: "Afternoon" },
  evening: { icon: "🌇", label: "Evening" },
  night: { icon: "🌙", label: "Night" },
};

/** The roof's output in words: what it's making now, or why it isn't. */
function solarLine(live: Live) {
  if (live.solarKw > 0) return `Roof solar ≈ ${live.solarKw} kW of ${live.solarPeakKw} kW`;
  return live.isDay ? "Roof solar ≈ 0 kW under the clouds" : `Roof solar: resting till sunrise, ${live.sunrise}`;
}

/** A clock that ticks every half minute in the browser, and doesn't exist while prerendering. */
const TICK = 30 * 1000;
const onTick = (tick: () => void) => {
  const timer = window.setInterval(tick, TICK);
  return () => window.clearInterval(timer);
};
const tickNow = () => Math.floor(Date.now() / TICK) * TICK;
const noClock = () => 0;

/** The time where the sky is, and which part of the day: "🌙 Night · 11:42 pm". */
function useDayTime(live: Live | null) {
  const now = useSyncExternalStore(onTick, tickNow, noClock);
  if (!live || !now) return null;
  const preview = previewPeriod();
  const { period } = sunAt(now, live.place.lat, live.place.lon, preview);
  return { ...PERIOD[period], clock: preview ? "preview" : clockAt(now, live.place.tz) };
}

/** Whose sky this is, in a sentence. */
function whose(live: Live, asked: string) {
  if (live.source === "home")
    return asked === "home" ? "Soni's sky in Jamshedpur, right now." : "We couldn't tell where you are, so this is Soni's sky in Jamshedpur.";
  return `The sky here is yours: ${live.place.name}'s weather and time, right now.`;
}

/** Use the visitor's exact location, or switch between their sky and Soni's. */
function PlaceSwitch() {
  const place = useStore((s) => s.place);
  const [note, setNote] = useState("");
  const pick = (p: typeof place) => {
    setNote("");
    choosePlace(p).catch((e: Error) => setNote(e.message));
  };
  return (
    <div className="live-places">
      {place !== "exact" ? (
        <button type="button" onClick={() => pick("exact")}>
          📍 Use my exact location
        </button>
      ) : null}
      <button type="button" onClick={() => pick(place === "home" ? "near" : "home")}>
        {place === "home" ? "Show my sky" : "Show Soni's sky"}
      </button>
      {note ? (
        <p className="live-places-note" role="status">
          {note}
        </p>
      ) : null}
    </div>
  );
}

/** Wide screens: the weather and time of day the sky shows, and what the roof would be making, top left. */
export function LiveCard() {
  const live = useStore((s) => s.live);
  const asked = useStore((s) => s.place);
  const visible = useStore((s) => s.phase === "built" && !s.panelOpen && !s.wallOpen);
  const time = useDayTime(live);
  if (!live || !time || !visible) return null;
  return (
    <section className="live" aria-label={`Live in ${live.place.name}`}>
      <p className="label">
        <span className="live-dot" aria-hidden="true" /> Live · {live.place.name}
      </p>
      <p className="live-main">
        {live.tempC}° · {live.weather}
      </p>
      <p className="live-time">
        <span aria-hidden="true">{time.icon}</span> {time.label} · {time.clock}
      </p>
      <p className="live-solar">{solarLine(live)}</p>
      <div className="live-meter" aria-hidden="true">
        <span style={{ width: `${Math.min(100, (live.solarKw / live.solarPeakKw) * 100)}%` }} />
      </div>
      <p className="live-note">{whose(live, asked)}</p>
      <PlaceSwitch />
    </section>
  );
}

/** Phones: the same in one line, inside the name card. */
export function LiveLine() {
  const live = useStore((s) => s.live);
  const time = useDayTime(live);
  if (!live || !time) return null;
  return (
    <div className="live-line">
      <p>
        <span className="live-dot" aria-hidden="true" /> {live.place.name} now: {live.tempC}° · {live.weather} · {time.icon} {time.label},{" "}
        {time.clock} · {solarLine(live)}
      </p>
      <PlaceSwitch />
    </div>
  );
}
