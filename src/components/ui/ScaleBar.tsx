"use client";

import { scales } from "@/content/scales";
import { useStore } from "@/lib/store";

/** The drawing scale: zoom from the whole city to the steel inside the concrete. */
export function ScaleBar() {
  const visible = useStore((s) => s.phase === "built" && !s.panelOpen && !s.wallOpen && !s.touring && !s.test);
  const current = useStore((s) => s.scale);
  if (!visible) return null;
  const level = scales.find((l) => l.id === current)!;

  return (
    <nav className="scale" aria-label="Drawing scale">
      <div className="scale-ruler" aria-hidden="true">
        {Array.from({ length: 8 }, (_, i) => (
          <span key={i} />
        ))}
      </div>
      <div className="scale-options">
        {scales.map((l) => (
          <button
            key={l.id}
            type="button"
            aria-pressed={l.id === current}
            onClick={() => useStore.getState().setScale(l.id)}
          >
            <span className="scale-ratio">{l.ratio}</span>
            <span className="scale-label">{l.label}</span>
          </button>
        ))}
      </div>
      {current !== "site" ? <p className="scale-caption">{level.caption}</p> : null}
    </nav>
  );
}
