-- The visitors' brick wall. `visitor` is a hash of the address, only for the hourly limit.
create table bricks (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 40),
  note text not null default '' check (length(note) <= 80),
  visitor text not null,
  created_at timestamptz not null default now()
);
create index bricks_created_at on bricks (created_at desc);
create index bricks_visitor on bricks (visitor, created_at desc);

-- Site photos and drawings Soni uploads in the studio. `key` is the object in the `assets` bucket;
-- `part` is the chapter of the building it belongs to.
create table photos (
  id uuid primary key default gen_random_uuid(),
  part text not null,
  key text not null unique,
  caption text not null default '' check (length(caption) <= 120),
  created_at timestamptz not null default now()
);
create index photos_part on photos (part, created_at desc);
