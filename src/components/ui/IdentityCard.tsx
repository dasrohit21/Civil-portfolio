"use client";

import { hotspots } from "@/content/building";
import { profile } from "@/content/profile";
import { useStore } from "@/lib/store";

/** Who she is and what's in the building, once it stands. */
export function IdentityCard() {
  const visible = useStore((s) => s.phase === "built" && !s.touring);
  const t = visible ? 0 : -1;

  return (
    <section className="identity" aria-hidden={!visible} aria-label={`About ${profile.name}`}>
      <p className="label">{profile.role} · {profile.place}</p>
      <h1 className="display identity-name">{profile.name}</h1>
      <p className="identity-headline">{profile.headline}</p>
      <ul className="identity-links">
        {profile.contact.map((c) => (
          <li key={c.href}>
            <a href={c.href} target="_blank" rel="noreferrer" tabIndex={t}>
              {c.short}
            </a>
          </li>
        ))}
      </ul>
      <div className="identity-actions">
        <button type="button" className="btn-primary" tabIndex={t} onClick={() => useStore.getState().startTour()}>
          Walk the building
        </button>
        <button type="button" className="btn-quiet" tabIndex={t} onClick={() => useStore.getState().print()}>
          Print drawings
        </button>
      </div>
      <nav className="parts-list" aria-label="In this building">
        <p className="label">In this building</p>
        <ul>
          {hotspots.map((h) => (
            <li key={h.id}>
              <button type="button" tabIndex={t} onClick={() => useStore.getState().open(h.id)}>
                {h.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <p className="hint">Tap a glowing dot, or scroll to walk from the ground up.</p>
    </section>
  );
}
