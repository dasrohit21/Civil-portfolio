"use client";

import { profile } from "@/content/profile";
import { useStore } from "@/lib/store";

/** The inspection stamp that lands once the scan has passed over the finished building. */
export function Stamp() {
  const stampAt = useStore((s) => s.stampAt);
  const built = useStore((s) => s.phase === "built");
  if (!stampAt || !built) return null;
  return (
    <div key={stampAt} className="stamp" role="status">
      <span className="stamp-main">Structurally sound ✓</span>
      <span className="stamp-sub">Checked by {profile.initials}</span>
    </div>
  );
}
