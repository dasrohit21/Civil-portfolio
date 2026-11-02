import { createHash } from "node:crypto";
import { attachDatabasePool } from "@vercel/functions";
import { Pool } from "pg";
import type { Brick, HotspotId } from "@/content/types";

/**
 * The only file that talks to the database: Neon Postgres over node-postgres, with Vercel's
 * pool handling. Server only: the connection string must never reach the browser.
 *
 * Set in .env.local (`neon deploy` / `neon env pull` writes it), and on Vercel:
 *   DATABASE_URL (pooled). Migrations use DATABASE_URL_UNPOOLED: `npm run db:migrate`.
 * Without it the wall shows as "opening soon" and nothing is stored.
 */
const url = process.env.DATABASE_URL;
// Neon URLs say sslmode=require; verify-full keeps the same checks without pg's warning.
const pool = url ? new Pool({ connectionString: url.replace("sslmode=require", "sslmode=verify-full") }) : null;
if (pool) {
  attachDatabasePool(pool);
  // An idle connection dropping (the compute scaling to zero) mustn't crash the server
  pool.on("error", (error) => console.error(error));
}

/** Bricks one address may lay per hour. */
const PER_HOUR = 3;

export const dbConfigured = () => pool !== null;

const query = <T extends object>(sql: string, params: unknown[] = []) => pool!.query<T>(sql, params).then((r) => r.rows);

/** Bricks as the site uses them; `at` is milliseconds. Shared with the live query. */
export const BRICK_COLUMNS = "id, name, note, (extract(epoch from created_at) * 1000)::float8 as at";

export const listBricks = (limit = 300) =>
  query<Brick>(`select ${BRICK_COLUMNS} from bricks order by created_at desc limit $1`, [limit]);

export const countBricks = () => query<{ n: number }>("select count(*)::int as n from bricks").then(([r]) => r.n);

/** Lays a brick unless this address has laid PER_HOUR in the last hour; null when it has. */
export async function addBrick(name: string, note: string, address: string): Promise<Brick | null> {
  const visitor = createHash("sha256").update(address).digest("hex").slice(0, 32);
  const [brick] = await query<Brick>(
    `insert into bricks (name, note, visitor)
     select $1, $2, $3
     where (select count(*) from bricks where visitor = $3 and created_at > now() - interval '1 hour') < $4
     returning ${BRICK_COLUMNS}`,
    [name, note, visitor, PER_HOUR],
  );
  return brick ?? null;
}

export const deleteBrick = (id: string) => query("delete from bricks where id = $1", [id]);

export type PhotoRow = { id: string; part: HotspotId; key: string; caption: string };

export const listPhotos = (part?: HotspotId) =>
  part
    ? query<PhotoRow>("select id, part, key, caption from photos where part = $1 order by created_at desc", [part])
    : query<PhotoRow>("select id, part, key, caption from photos order by created_at desc");

export const addPhoto = (part: HotspotId, key: string, caption: string) =>
  query<PhotoRow>("insert into photos (part, key, caption) values ($1, $2, $3) returning id, part, key, caption", [part, key, caption]).then(([r]) => r);

/** Removes the row and returns its object key, so the caller can delete the file. */
export const deletePhoto = (id: string) =>
  query<{ key: string }>("delete from photos where id = $1 returning key", [id]).then(([r]) => r?.key ?? null);
