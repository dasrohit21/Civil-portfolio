"use client";

import { createRealtimeClient, type SealedLiveQuery } from "@neon/realtime/client";
import { RealtimeProvider, useLiveQuery } from "@neon/realtime-react";
import { useEffect, useState } from "react";
import type { Brick } from "@/content/types";
import { useStore } from "@/lib/store";

type SealedWall = { url: string; bricks: SealedLiveQuery<Brick>; count: SealedLiveQuery<{ id: number; n: number }> };

const sealWall = async (): Promise<SealedWall> => {
  const res = await fetch("/api/bricks/live", { method: "POST" });
  if (!res.ok) throw new Error(`The wall answered ${res.status}`);
  return res.json();
};
const renewBricks = () => sealWall().then((s) => s.bricks);
const renewCount = () => sealWall().then((s) => s.count);

/** Keeps the visitors' wall live through Neon Realtime: a brick laid anywhere appears for everyone. */
export function LiveWall() {
  const [sealed, setSealed] = useState<SealedWall | null>(null);

  useEffect(() => {
    let alive = true;
    sealWall().then((s) => alive && setSealed(s), () => {}); // without Realtime the wall still loads once
    return () => {
      alive = false;
    };
  }, []);

  return sealed ? <Subscribed sealed={sealed} /> : null;
}

function Subscribed({ sealed }: { sealed: SealedWall }) {
  // One client for the page; it opens its socket on the first subscription.
  const [client] = useState(() => createRealtimeClient({ url: sealed.url }));
  return (
    <RealtimeProvider client={client}>
      <Feed sealed={sealed} />
    </RealtimeProvider>
  );
}

function Feed({ sealed }: { sealed: SealedWall }) {
  const bricks = useLiveQuery(sealed.bricks, { refreshQuery: renewBricks });
  const count = useLiveQuery(sealed.count, { refreshQuery: renewCount });

  useEffect(() => {
    if (bricks.data && count.data) useStore.getState().setWall({ configured: true, count: count.data[0]?.n ?? 0, bricks: [...bricks.data] });
  }, [bricks.data, count.data]);

  return null;
}
