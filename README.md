# Lady_Boss · Soni Kumari's portfolio

An interactive 3D portfolio for **Soni Kumari, Civil & Design Engineer** (Jamshedpur).
Her career runs from drawing buildings to designing their foundations, powering them with
solar and auditing them, so the site does the same:

1. **The sketch.** A pencil draws a building on drafting paper while the title block is lettered by hand.
2. **Build it.** One button raises the sketch into 3D: diaphragm walls, rebar cages, concrete
   floor by floor, glass, solar panels, then an NDT scan and a "Structurally sound" stamp.
3. **The building.** Each part opens a chapter of her work: site office, foundations, columns,
   NDT scanner, green plaque, Vastu compass, solar roof. Scroll or use the arrow keys to walk it from the ground up.
4. **Print drawings.** The building folds back into paper and becomes a one-page drawing-sheet resume (with a PDF).

Stack: Next.js 16, React 19, React Three Fiber + three.js + drei, zustand, Tailwind 4, TypeScript,
and [Neon](https://neon.com) for the database, live updates, sign-in and file storage.
There is no separate backend: everything is one Next.js project, with Neon's services declared in `neon.ts`.

## Run it

```bash
npm install
npm run db:migrate   # once, and after adding a migration (needs .env.local)
npm run dev          # http://localhost:3000
```

```bash
npm run build && npm start   # production
```

## Where things live

| What | Where |
| --- | --- |
| Soni's details: profile, jobs, education, skills, contact | `src/content/profile.ts` |
| Which part of the building opens what, and the walk order | `src/content/building.ts` |
| Content types | `src/content/types.ts` |
| Home page / resume page (thin, they only place components) | `src/app/page.tsx`, `src/app/resume/page.tsx` |
| Act 1: the pencil sketch and the title block | `src/components/sketch/` |
| Acts 2–3: the 3D scene | `src/components/building/` |
| The building as data: parts, build timing, hotspot positions, camera | `src/components/building/model.ts` |
| Panel, walk card, name card, stamp | `src/components/ui/` |
| Ties the page together: keys, scroll, swipe | `src/components/Experience.tsx` |
| Shared state (phase, what's open, the walk) | `src/lib/store.ts` |
| Neon: database, live wall, sign-in, files | `src/lib/db.ts`, `realtime.ts`, `auth.ts`, `storage.ts` (see [Neon](#neon-phase-5)) |
| Soni's studio | `src/app/studio/`, `src/components/studio/` |
| Colours, fonts, layout | `src/app/globals.css`, `src/app/resume/resume.css` |

**To change what the site says, edit only `src/content/`.** The 3D code never needs touching for content.

**To change the building**, edit `parts` in `model.ts`. Each part has a position, a size, a material
and the moment it appears in the build (`start`, `dur`). The pencil sketch is `sketchSegments()` in the same file.

## The PDF resume

`public/soni-kumari-resume.pdf` is printed from `/resume`, so it always matches the site.
After changing content, start the site and run:

```bash
npm run resume:pdf                                   # site on http://localhost:3000
SITE_URL=http://localhost:3107 npm run resume:pdf    # or another address
```

It uses the Chrome installed on this computer and warns if the resume no longer fits on one A4 page.

## Phases

| Phase | What | Status |
| --- | --- | --- |
| 1 | Sketch → Build it → 3D building, chapters, walk, resume mode + PDF, phones | ✅ Done |
| 2 | "Try to break it": loads, earthquake, wind, flood, stress heatmap | ✅ Done |
| 3 | Jamshedpur's live weather in the scene, the roof's solar output, the visitors' brick wall | ✅ Done |
| 4 | The scale bar: 1:5000 city, 1:500 site, 1:20 steel (see-through concrete, rebar inside) | ✅ Done |
| 5 | Neon: the wall in Postgres and live for everyone, Soni's studio (sign-in, remove bricks, add site photos) | ✅ Done |

**Where the newer parts live:** the stress tests' text in `src/content/tests.ts` (effects in
`src/components/building/StressTest.tsx`, toolbar in `src/components/ui/StressTools.tsx`); the scales'
captions in `src/content/scales.ts` (camera views in `SCALE_VIEWS` in `model.ts`, the bar in `src/components/ui/ScaleBar.tsx`).

## Keys and settings

Copy `.env.example` to `.env.local` and fill it in. `.env.local` is **never committed**
(`.gitignore` ignores every `.env*` file except the blank `.env.example`), and the keys are only
read on the server, so they never reach the browser. On Vercel, add the same values under
Project → Settings → Environment Variables.

| Variable | For | Without it |
| --- | --- | --- |
| `WEATHER_API_KEY` | Live weather from [WeatherAPI.com](https://www.weatherapi.com) | The site stays in clear golden hour and hides the live card |
| `DATABASE_URL`, `DATABASE_URL_UNPOOLED` | The visitors' wall and the photo list (Neon Postgres) | The wall shows "opens soon" and nothing is stored |
| `NEON_REALTIME_URL`, `NEON_REALTIME_SECRET` | New bricks appear for everyone, live | The wall loads once per visit |
| `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET` | Signing in to the studio | The studio says sign-in isn't set up |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_ENDPOINT_URL_S3`, `AWS_REGION` | Site photos in Neon Object Storage | No photos; uploads refused |

`neon deploy` writes every Neon variable into `.env.local` and keeps the lines it doesn't manage.
`NEON_AUTH_COOKIE_SECRET` is ours: any random 32+ characters (see `.env.example`).

## Live weather (Phase 3)

The scene shows **Jamshedpur's weather right now**: rain falls over the site as hard as it rains
there, storms bring lightning, clouds grey the sunset and dim the sun, fog thickens the haze.
A card shows the temperature, the conditions and what the model's 4.8 kWp roof would be making
from the real solar radiation.

| File | What it does |
| --- | --- |
| `src/lib/weather.ts` | Asks WeatherAPI.com (server only, cached for minutes) and turns the reply into a weather kind the scene understands |
| `src/app/api/sky/route.ts` | `GET /api/sky`: the page's way to ask |
| `src/components/building/Rain.tsx`, `Sky.tsx`, `Rig.tsx` | Rain and snow, the clouded sky and lightning, the dimmed sun and the fog |
| `src/components/ui/LiveCard.tsx` | The live card (wide screens) and line (phones) |

To see other weather, add `?weather=rain` to the address (or `storm`, `fog`, `snow`, `overcast`, `cloudy`, `clear`).

## Neon (Phase 5)

Neon's services are declared in **`neon.ts`** and created with `neon deploy` (project
`square-frog-40878387`, branch `production`, region Singapore). Each service has **one file** that talks to it:

| Service | File | Used for |
| --- | --- | --- |
| Postgres | `src/lib/db.ts` | The wall (`listBricks`, `addBrick` with 3 per address per hour, `deleteBrick`) and the photo list. node-postgres with Vercel's pool handling, over the pooled URL. |
| Realtime | `src/lib/realtime.ts` | Seals the wall's two live queries (newest 300 bricks, and the count). `src/components/ui/LiveWall.tsx` subscribes, so a brick laid or removed anywhere shows for everyone at once. |
| Auth | `src/lib/auth.ts`, `src/lib/auth-client.ts` | Studio sign-in with a code sent by email. Only accounts with the **admin** role get in. Public sign-up is **off**. |
| Object Storage | `src/lib/storage.ts` | Site photos in the private `assets` bucket, read through signed links that last an hour |
| Functions | `hello.ts` | Neon's sample function, deployed at `NEON_FUNCTION_HELLO_BASE_URL`. The site doesn't use it. |

The schema is code: `db/migrations/*.sql`, applied in order by `npm run db:migrate` (over the unpooled URL).
Add a new numbered file for any change; never edit one that has run.

| Route | Who | What |
| --- | --- | --- |
| `GET/POST /api/bricks` | anyone | Read the wall, lay a brick |
| `POST /api/bricks/live` | anyone | The wall's sealed live queries (they expire after a minute and renew themselves) |
| `GET /api/photos?part=solar` | anyone | A chapter's photos, shown in its panel |
| `/api/auth/*` | anyone | Neon Auth, on this site's own origin |
| `/api/studio/*` | Soni (admin) | Remove a brick; upload, list and delete photos. Checked on every request, 401/403 otherwise. |

### The studio

**`/studio`** (not linked from the site): Soni enters her email, gets a code, and signs in. There she can
remove unkind bricks (they vanish from every open page) and upload site photos or drawings to a chapter of
the building (JPG, PNG or WebP under 4 MB); they appear in that chapter's panel.

Her account (`sonikumari2002238@gmail.com`) already exists with the admin role. To let someone else in:

```bash
neon neon-auth user create --email someone@example.com
neon neon-auth user set-role <their id> --roles admin
```

Sign-in codes come from Neon's shared mail service, which is meant for getting started. Before relying on it,
set up your own email provider: https://neon.com/docs/auth/production-checklist.md

### After deploying to Vercel

1. Add every variable from `.env.local` in Vercel (Import .env works).
2. Add the site's address to Realtime in `neon.ts`, then `neon deploy -y`:
   `realtime: { allowedOrigins: ["http://localhost:3000", "https://<your-site>.vercel.app"] }`
3. Trust the address for sign-in: `neon neon-auth domain add https://<your-site>.vercel.app`

## Before going live

- [ ] Soni confirms her **LinkedIn** address (the one on the CV looks generic) — `src/content/profile.ts`
- [ ] Soni decides whether her **phone number** goes on the site (left off for now)
- [ ] Soni reads the short intros in `src/content/building.ts`; they are written in her voice and need her approval
- [ ] A portrait photo and any site photos or drawings she is allowed to share
- [ ] Deploy on Vercel with every variable from `.env.local`, then the two Neon steps in [After deploying to Vercel](#after-deploying-to-vercel)
- [ ] Custom email provider for the studio's sign-in codes (Neon's shared one is for getting started)
