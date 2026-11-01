"use client";

import Link from "next/link";
import { profile } from "@/content/profile";
import { useStore } from "@/lib/store";

/** Act 1: the drawing's title block, lettered by hand while the pencil draws, then "Build it". */
export function TitleBlock() {
  const visible = useStore((s) => s.phase === "sketch");
  const ready = useStore((s) => s.sketchDone);

  return (
    <section className="title-block" aria-hidden={!visible} data-ready={ready}>
      <p className="hand title-lead">Every building starts as a sketch.</p>
      <dl className="tb-grid">
        <div className="tb-row tb-wide">
          <dt>Project</dt>
          <dd className="hand tb-name">{profile.name}</dd>
        </div>
        <div className="tb-row tb-wide">
          <dt>Description</dt>
          <dd className="hand">{profile.role}</dd>
        </div>
        <div className="tb-row tb-wide">
          <dt>Location</dt>
          <dd className="hand">{profile.place}</dd>
        </div>
        <div className="tb-row">
          <dt>Drawn by</dt>
          <dd className="hand">{profile.initials}</dd>
        </div>
        <div className="tb-row">
          <dt>Scale</dt>
          <dd className="hand">1 : 100</dd>
        </div>
        <div className="tb-row">
          <dt>Sheet</dt>
          <dd className="hand">A-001</dd>
        </div>
      </dl>
      <div className="tb-actions">
        <button
          type="button"
          className="btn-build"
          tabIndex={visible ? 0 : -1}
          onClick={() => (ready ? useStore.getState().build() : useStore.getState().finishSketch())}
        >
          {ready ? "Build it" : "Skip the drawing"}
        </button>
        <Link href="/resume" className="link-quiet" tabIndex={visible ? 0 : -1}>
          Just the resume
        </Link>
      </div>
    </section>
  );
}
