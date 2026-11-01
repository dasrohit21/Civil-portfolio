"use client";

import { Html } from "@react-three/drei";
import { hotspots } from "@/content/building";
import { useStore } from "@/lib/store";
import { ANCHORS } from "./model";

/** A glowing dot on each part of the finished building. Hover shows its name; a click opens it. */
export function Hotspots() {
  const show = useStore((s) => s.phase === "built" && !s.panelOpen);
  const hovered = useStore((s) => s.hovered);
  const focus = useStore((s) => s.focus);
  const touring = useStore((s) => s.touring);
  if (!show) return null;

  return (
    <>
      {hotspots.map((h) => {
        const here = touring && focus === h.id;
        return (
          <Html key={h.id} position={ANCHORS[h.id]} center zIndexRange={[5, 0]}>
            <button
              type="button"
              tabIndex={-1}
              className={`hotspot ${here ? "is-here" : ""}`}
              aria-label={`Open ${h.label}: ${h.hint}`}
              onPointerEnter={(e) => e.pointerType === "mouse" && useStore.getState().hover(h.id)}
              onPointerLeave={() => useStore.getState().hover(null)}
              onClick={(e) => {
                e.stopPropagation();
                useStore.getState().open(h.id);
              }}
            >
              <span className="hotspot-dot" aria-hidden="true" />
              {hovered === h.id || here ? (
                <span className="hotspot-tag">
                  <span className="hotspot-label">{h.label}</span>
                  <span className="hotspot-hint">{h.hint}</span>
                </span>
              ) : null}
            </button>
          </Html>
        );
      })}
    </>
  );
}
