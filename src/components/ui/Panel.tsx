"use client";

import { useEffect, useRef } from "react";
import { hotspotById, hotspots } from "@/content/building";
import { jobById } from "@/content/profile";
import { useStore } from "@/lib/store";

/** The open part of the building: its story, the job behind it, and the skills it used. */
export function Panel() {
  const open = useStore((s) => s.panelOpen);
  const focus = useStore((s) => s.focus);
  const heading = useRef<HTMLHeadingElement>(null);
  const h = hotspotById(focus);
  const job = jobById(h?.job);
  const next = h ? hotspots[(hotspots.indexOf(h) + 1) % hotspots.length] : null;
  const t = open ? 0 : -1;

  useEffect(() => {
    if (open) heading.current?.focus({ preventScroll: true });
  }, [open, focus]);

  return (
    <aside className="panel" data-open={open} aria-hidden={!open} aria-labelledby="panel-title">
      {h ? (
        <div className="panel-inner">
          <div className="panel-top">
            <p className="label">{h.label}</p>
            <button type="button" className="btn-quiet" tabIndex={t} onClick={() => useStore.getState().close()}>
              Close
            </button>
          </div>
          <h2 id="panel-title" ref={heading} tabIndex={-1} className="display panel-title">
            {h.title}
          </h2>
          <p className="panel-intro">{h.intro}</p>

          {job ? (
            <div className="job">
              <p className="job-role">{job.role}</p>
              <p className="job-org">
                {job.org} · {job.place}
              </p>
              <p className="label">{job.period}</p>
              <ul className="job-points">
                {job.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {h.lines ? (
            <ul className="job-points">
              {h.lines.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          ) : null}

          {h.skills ? (
            <ul className="chips" aria-label="Skills">
              {h.skills.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          ) : null}

          {next ? (
            <button type="button" className="panel-next" tabIndex={t} onClick={() => useStore.getState().open(next.id)}>
              Next: {next.label} →
            </button>
          ) : null}
        </div>
      ) : null}
    </aside>
  );
}
