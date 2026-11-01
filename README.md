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
| 2 | "Try to break it": loads, earthquake, wind, flood, stress heatmap | Planned |
| 3 | Live sun, solar output and weather; the visitors' brick wall (database) | Planned |
| 4 | The 1:∞ zoom from the city down to the rebar | Optional |

## The database (Phase 3)

Phases 1 and 2 need no database. Phase 3's **visitors' brick wall** does (live weather does not:
that is a free API called from an API route). None of these files exist yet; this is where they will go,
so the database stays in one place:

| File | What it does |
| --- | --- |
| `.env.local` | The database URL and key (e.g. `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`). Never committed: `.env*` is in `.gitignore`. Add the same values in Vercel → Project → Settings → Environment Variables. |
| `src/lib/db.ts` | **The only file that talks to the database.** Creates the client from the env vars and exports small functions like `listBricks()` and `addBrick()`. Server-only. |
| `src/app/api/bricks/route.ts` | The API route the page calls: `GET` lists bricks, `POST` lays one (with length limits and a simple rate limit). It uses `src/lib/db.ts`. |
| `src/app/api/sky/route.ts` | Live sun, solar output and weather from Open-Meteo. No database, no key. |
| `src/components/ui/BrickWall.tsx` | The wall itself: shows the bricks and the "lay a brick" form. Calls `/api/bricks`, never the database directly. |

Suggested host: Supabase or Upstash (both have free tiers). Switching later means changing only `src/lib/db.ts`.

## Before going live

- [ ] Soni confirms her **LinkedIn** address (the one on the CV looks generic) — `src/content/profile.ts`
- [ ] Soni decides whether her **phone number** goes on the site (left off for now)
- [ ] Soni reads the short intros in `src/content/building.ts`; they are written in her voice and need her approval
- [ ] A portrait photo and any site photos or drawings she is allowed to share
- [ ] Deploy on Vercel
