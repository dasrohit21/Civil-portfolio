"use client";

import { hotspots } from "@/content/building";
import { useStore } from "@/lib/store";

/** The walk through the building: one part at a time, from the site office up to the roof. */
export function TourCard() {
  const touring = useStore((s) => s.touring && !s.panelOpen);
  const index = useStore((s) => s.tourIndex);
  if (!touring) return null;
  const h = hotspots[index];

  return (
    <section className="tour" aria-label="Walk through the building">
      <div className="tour-progress" aria-hidden="true">
        <span style={{ width: `${((index + 1) / hotspots.length) * 100}%` }} />
      </div>
      <p className="label">
        {index + 1} / {hotspots.length} · {h.hint}
      </p>
      <h2 className="tour-title">{h.label}</h2>
      <p className="tour-intro">{h.intro}</p>
      <div className="tour-nav">
        <button type="button" className="btn-quiet" onClick={() => useStore.getState().stepTour(-1)} disabled={index === 0}>
          ← Back
        </button>
        <button type="button" className="btn-primary" onClick={() => useStore.getState().open(h.id)}>
          Open
        </button>
        <button type="button" className="btn-quiet" onClick={() => useStore.getState().stepTour(1)}>
          {index === hotspots.length - 1 ? "Finish" : "Next →"}
        </button>
        <button type="button" className="tour-end" aria-label="End the walk" onClick={() => useStore.getState().stopTour()}>
          ✕
        </button>
      </div>
    </section>
  );
}
