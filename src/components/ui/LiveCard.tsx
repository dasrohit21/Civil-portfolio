"use client";

import type { Live } from "@/content/types";
import { useStore } from "@/lib/store";

/** The roof's output in words: what it's making now, or why it isn't. */
function solarLine(live: Live) {
  if (live.solarKw > 0) return `Roof solar ≈ ${live.solarKw} kW of ${live.solarPeakKw} kW`;
  return live.isDay ? "Roof solar ≈ 0 kW under the clouds" : `Roof solar: resting till sunrise, ${live.sunrise}`;
}

/** Wide screens: Jamshedpur right now, and what the roof would be making, in the bottom right corner. */
export function LiveCard() {
  const live = useStore((s) => s.live);
  const visible = useStore((s) => s.phase === "built" && !s.panelOpen && !s.wallOpen);
  if (!live || !visible) return null;
  return (
    <section className="live" aria-label="Live in Jamshedpur">
      <p className="label">
        <span className="live-dot" aria-hidden="true" /> Live · Jamshedpur
      </p>
      <p className="live-main">
        {live.tempC}° · {live.weather}
      </p>
      <p className="live-solar">{solarLine(live)}</p>
      <div className="live-meter" aria-hidden="true">
        <span style={{ width: `${Math.min(100, (live.solarKw / live.solarPeakKw) * 100)}%` }} />
      </div>
      <p className="live-note">The weather on this site is Jamshedpur&apos;s, right now.</p>
    </section>
  );
}

/** Phones: the same in one line, inside the name card. */
export function LiveLine() {
  const live = useStore((s) => s.live);
  if (!live) return null;
  return (
    <p className="live-line">
      <span className="live-dot" aria-hidden="true" /> Jamshedpur now: {live.tempC}° · {live.weather} · {solarLine(live)}
    </p>
  );
}
