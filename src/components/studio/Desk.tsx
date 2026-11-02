"use client";

import { useEffect, useState } from "react";
import { hotspots } from "@/content/building";
import type { Brick, Photo } from "@/content/types";

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? `The server answered ${res.status}`);
  return res.json();
}

/** The studio's two jobs: the wall and the photos. */
export function Desk() {
  const [bricks, setBricks] = useState<Brick[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    Promise.all([fetch("/api/bricks").then(json<{ bricks?: Brick[] }>), fetch("/api/studio/photos").then(json<Photo[]>)])
      .then(([wall, list]) => {
        if (!alive) return;
        setBricks(wall.bricks ?? []);
        setPhotos(list);
      })
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, []);

  async function removeBrick(id: string) {
    setError("");
    const res = await fetch(`/api/studio/bricks/${id}`, { method: "DELETE" });
    if (res.ok) setBricks((b) => b.filter((x) => x.id !== id));
    else setError("That brick wouldn't come out.");
  }

  async function upload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setError("");
    try {
      const photo = await json<Photo>(await fetch("/api/studio/photos", { method: "POST", body: new FormData(form) }));
      setPhotos((p) => [photo, ...p]);
      form.reset();
    } catch (err) {
      setError((err as Error).message);
    }
    setBusy(false);
  }

  async function removePhoto(id: string) {
    setError("");
    const res = await fetch(`/api/studio/photos/${id}`, { method: "DELETE" });
    if (res.ok) setPhotos((p) => p.filter((x) => x.id !== id));
    else setError("That photo wouldn't delete.");
  }

  return (
    <div className="studio-desk">
      {error ? (
        <p className="studio-error" role="alert">
          {error}
        </p>
      ) : null}

      <section className="studio-card">
        <h2 className="studio-h2">Site photos</h2>
        <p className="studio-note">Each photo shows in its chapter of the building. JPG, PNG or WebP, under 4 MB.</p>
        <form className="studio-form" onSubmit={upload}>
          <label>
            <span className="label">Photo</span>
            <input type="file" name="file" accept="image/jpeg,image/png,image/webp" required />
          </label>
          <label>
            <span className="label">Chapter</span>
            <select name="part" required defaultValue="">
              <option value="" disabled>
                Choose…
              </option>
              {hotspots.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="label">Caption</span>
            <input name="caption" maxLength={120} />
          </label>
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? "Uploading…" : "Upload"}
          </button>
        </form>
        <ul className="studio-photos">
          {photos.map((p) => (
            <li key={p.id}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={p.caption || "Site photo"} />
              <p>
                {hotspots.find((h) => h.id === p.part)?.label}
                {p.caption ? ` · ${p.caption}` : ""}
              </p>
              <button type="button" className="link-quiet" onClick={() => removePhoto(p.id)}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="studio-card">
        <h2 className="studio-h2">Visitors&apos; wall · {bricks.length}</h2>
        <p className="studio-note">Removing a brick takes it off the wall for everyone, straight away.</p>
        {bricks.length ? (
          <ul className="studio-bricks">
            {bricks.map((b) => (
              <li key={b.id}>
                <span>
                  <strong>{b.name}</strong>
                  {b.note ? ` — ${b.note}` : ""}
                </span>
                <button type="button" className="link-quiet" onClick={() => removeBrick(b.id)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="studio-note">No bricks yet.</p>
        )}
      </section>
    </div>
  );
}
