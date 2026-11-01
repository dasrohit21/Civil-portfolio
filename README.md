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

Stack: Next.js 16, React 19, React Three Fiber + three.js + drei, zustand, Tailwind 4, TypeScript.
There is no separate backend: everything is one Next.js project.

## Run it

```bash
npm install
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
| 3 | Jamshedpur's live weather in the scene, the roof's solar output, the visitors' brick wall | ✅ Done (the wall needs its database keys) |
| 4 | The 1:∞ zoom from the city down to the rebar | Optional |

## Keys and settings

Copy `.env.example` to `.env.local` and fill it in. `.env.local` is **never committed**
(`.gitignore` ignores every `.env*` file except the blank `.env.example`), and the keys are only
read on the server, so they never reach the browser. On Vercel, add the same values under
Project → Settings → Environment Variables.

| Variable | For | Without it |
| --- | --- | --- |
| `WEATHER_API_KEY` | Live weather from [WeatherAPI.com](https://www.weatherapi.com) | The site stays in clear golden hour and hides the live card |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | The visitors' wall, from a free [Upstash](https://upstash.com) Redis database | The wall shows "opens soon" and nothing is stored |

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

## The database (Phase 3)

Only the **visitors' brick wall** uses a database, and only one file talks to it:

| File | What it does |
| --- | --- |
| `.env.local` | `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` (Vercel's Upstash integration names them `KV_REST_API_URL` and `KV_REST_API_TOKEN`; both work) |
| `src/lib/db.ts` | **The only file that talks to the database**: `listBricks()`, `countBricks()`, `addBrick()`, and `allowVisitor()` (3 bricks per address per hour). Server only. |
| `src/app/api/bricks/route.ts` | `GET` lists the wall, `POST` lays a brick (name up to 40 characters, a line up to 80) |
| `src/components/ui/BrickWall.tsx` | The wall panel: every brick and the "lay a brick" form. Calls `/api/bricks`, never the database. |
| `src/components/building/VisitorWall.tsx` | The wall in 3D: one brick per visitor |

Switching to another database later means changing only `src/lib/db.ts`.

## Before going live

- [ ] Soni confirms her **LinkedIn** address (the one on the CV looks generic) — `src/content/profile.ts`
- [ ] Soni decides whether her **phone number** goes on the site (left off for now)
- [ ] Soni reads the short intros in `src/content/building.ts`; they are written in her voice and need her approval
- [ ] A portrait photo and any site photos or drawings she is allowed to share
- [ ] Create the Upstash database and add its keys (the visitors' wall)
- [ ] Deploy on Vercel, with `WEATHER_API_KEY` and the Upstash keys in its environment variables
