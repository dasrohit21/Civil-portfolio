"use client";

import { useEffect, useRef, useState } from "react";
import { hotspotById, hotspots } from "@/content/building";
import { jobById } from "@/content/profile";
import type { HotspotId, Photo } from "@/content/types";
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

          {open ? <ChapterPhotos part={h.id} /> : null}

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

/** Site photos and drawings Soni added to this chapter in the studio. */
function ChapterPhotos({ part }: { part: HotspotId }) {
  const [photos, setPhotos] = useState<{ part: HotspotId; list: Photo[] } | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/photos?part=${part}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((list: Photo[]) => alive && setPhotos({ part, list }))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [part]);

  const list = photos?.part === part ? photos.list : [];
  if (!list.length) return null;
  return (
    <ul className="chapter-photos" aria-label="From site">
      {list.map((p) => (
        <li key={p.id}>
          <figure>
            {/* Signed links from private storage, so next/image's optimiser can't cache them */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt={p.caption || "Site photo"} loading="lazy" />
            {p.caption ? <figcaption>{p.caption}</figcaption> : null}
          </figure>
        </li>
      ))}
    </ul>
  );
}
