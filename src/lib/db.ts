import type { Brick } from "@/content/types";

/**
 * The only file that talks to the database: an Upstash Redis store, used over its REST API
 * (no SDK). Server only: the keys come from the environment and must never reach the browser.
 *
 * Set in .env.local, and in Vercel → Project → Settings → Environment Variables:
 *   UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
 * (Vercel's Upstash integration names them KV_REST_API_URL and KV_REST_API_TOKEN; both work.)
 * Without them the wall shows as "opening soon" and nothing is stored.
 */
const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

const KEY = "bricks";
/** The wall keeps the newest bricks; older ones drop off the end. */
const MAX_BRICKS = 2000;
/** Bricks one address may lay per hour. */
const PER_HOUR = 3;

export const dbConfigured = () => Boolean(url && token);

async function redis<T>(command: (string | number)[]): Promise<T> {
  const res = await fetch(url!, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Database answered ${res.status}`);
  return (await res.json()).result as T;
}

export async function listBricks(limit = 300): Promise<Brick[]> {
  const raw = await redis<string[]>(["LRANGE", KEY, 0, limit - 1]);
  return raw.flatMap((r) => {
    try {
      return [JSON.parse(r) as Brick];
    } catch {
      return [];
    }
  });
}

export const countBricks = () => redis<number>(["LLEN", KEY]);

export async function addBrick(brick: Brick) {
  await redis(["LPUSH", KEY, JSON.stringify(brick)]);
  await redis(["LTRIM", KEY, 0, MAX_BRICKS - 1]);
}

/** True while this address is under its hourly limit. */
export async function allowVisitor(address: string) {
  const key = `rate:${address}`;
  const n = await redis<number>(["INCR", key]);
  if (n === 1) await redis(["EXPIRE", key, 3600]);
  return n <= PER_HOUR;
}
