// Applies db/migrations/*.sql in order, each once, over the direct (unpooled) connection.
//   npm run db:migrate
import { readdirSync, readFileSync } from "node:fs";
import pg from "pg";

try {
  process.loadEnvFile(".env.local");
} catch {
  // On a server the variables come from the environment
}
const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) throw new Error("Set DATABASE_URL_UNPOOLED (or DATABASE_URL) first.");

const client = new pg.Client({ connectionString: url.replace("sslmode=require", "sslmode=verify-full") });
await client.connect();
try {
  await client.query("create table if not exists migrations (name text primary key, applied_at timestamptz not null default now())");
  const done = new Set((await client.query("select name from migrations")).rows.map((r) => r.name));
  const files = readdirSync("db/migrations").filter((f) => f.endsWith(".sql")).sort();
  for (const name of files) {
    if (done.has(name)) continue;
    await client.query("begin");
    try {
      await client.query(readFileSync(`db/migrations/${name}`, "utf8"));
      await client.query("insert into migrations (name) values ($1)", [name]);
      await client.query("commit");
      console.log(`applied ${name}`);
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  }
  console.log("database is up to date");
} finally {
  await client.end();
}
