import { createRealtime, rawSql } from "@neon/realtime/server";
import type { Brick } from "@/content/types";
import { BRICK_COLUMNS } from "./db";

/**
 * Live queries through Neon Realtime. Server only: NEON_REALTIME_SECRET seals the queries,
 * and the browser gets only the sealed result plus NEON_REALTIME_URL to subscribe with.
 */
const secret = process.env.NEON_REALTIME_SECRET;
const url = process.env.NEON_REALTIME_URL;
const db = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).pathname.slice(1) : "neondb";
const realtime = secret && url ? createRealtime({ secret, db }) : null;

export const realtimeConfigured = () => realtime !== null;

const wallQuery = rawSql<Brick>(`select ${BRICK_COLUMNS} from bricks order by created_at desc limit 300`);
const countQuery = rawSql<{ id: number; n: number }>("select 1 as id, count(*)::int as n from bricks");

/** The wall and its count, sealed for the browser. Sealed queries last about a minute. */
export async function sealWall() {
  const [bricks, count] = await Promise.all([realtime!.seal({ query: wallQuery }), realtime!.seal({ query: countQuery })]);
  return { url: url!, bricks, count };
}
