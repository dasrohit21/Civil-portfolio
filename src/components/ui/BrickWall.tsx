"use client";

import { useState } from "react";
import { profile } from "@/content/profile";
import type { Brick } from "@/content/types";
import { useStore } from "@/lib/store";

const firstName = profile.name.split(" ")[0];

/** The visitors' wall: everyone who laid a brick, and a form to lay yours. */
export function BrickWall() {
  const open = useStore((s) => s.wallOpen);
  const configured = useStore((s) => s.wallConfigured);
  const bricks = useStore((s) => s.bricks);
  const count = useStore((s) => s.brickCount);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const t = open ? 0 : -1;

  async function lay(form: HTMLFormElement) {
    const data = new FormData(form);
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch("/api/bricks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: data.get("name"), note: data.get("note") }),
      });
      const body = (await res.json()) as { brick?: Brick; count?: number; error?: string };
      if (!res.ok || !body.brick) throw new Error(body.error ?? "The brick didn't stick. Try again in a moment.");
      useStore.getState().laidBrick(body.brick, body.count ?? count + 1);
      form.reset();
      setStatus({ ok: true, text: "Your brick is in the wall. Thank you!" });
    } catch (e) {
      setStatus({ ok: false, text: e instanceof Error ? e.message : "The brick didn't stick." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className="panel wall" data-open={open} aria-hidden={!open} aria-labelledby="wall-title">
      <div className="panel-inner">
        <div className="panel-top">
          <p className="label">The visitors&apos; wall</p>
          <button type="button" className="btn-quiet" tabIndex={t} onClick={() => useStore.getState().closeWall()}>
            Close
          </button>
        </div>
        <h2 id="wall-title" className="display panel-title">
          Lay a brick
        </h2>
        <p className="panel-intro">
          {configured
            ? count
              ? `Built with ${count} visitor${count === 1 ? "" : "s"}. Leave your name for ${firstName}.`
              : `Be the first brick. Leave your name for ${firstName}.`
            : configured === false
              ? "The wall opens soon."
              : "Counting the bricks…"}
        </p>

        {configured ? (
          <form
            className="wall-form"
            onSubmit={(e) => {
              e.preventDefault();
              void lay(e.currentTarget);
            }}
          >
            <label>
              <span className="label">Your name</span>
              <input name="name" required maxLength={40} autoComplete="name" tabIndex={t} />
            </label>
            <label>
              <span className="label">A line for {firstName} (optional)</span>
              <input name="note" maxLength={80} tabIndex={t} />
            </label>
            <button type="submit" className="btn-primary" disabled={busy} tabIndex={t}>
              {busy ? "Laying…" : "Lay my brick"}
            </button>
            {status ? (
              <p className={`wall-status ${status.ok ? "is-ok" : "is-error"}`} role="status">
                {status.text}
              </p>
            ) : null}
          </form>
        ) : null}

        {bricks.length ? (
          <ul className="bricks" aria-label="Bricks in the wall, newest first">
            {bricks.map((b) => (
              <li key={`${b.at}-${b.name}`} title={b.note || undefined}>
                <span className="brick-name">{b.name}</span>
                {b.note ? <span className="brick-note">{b.note}</span> : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </aside>
  );
}
