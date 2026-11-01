import type { HotspotId } from "@/content/types";

/**
 * The building, as data. Units are metres of a model; the ground is y = 0 and the
 * building's footprint runs x -3..3, z -2..2 (z+ faces the camera). Building.tsx turns
 * `parts` into meshes, SketchLines.tsx turns `sketchSegments` into pencil lines, and the
 * Rig points the camera at `ANCHORS`.
 */
export type V3 = [number, number, number];

export type Mat =
  | "concrete" | "foundation" | "glass" | "door" | "solar" | "brass" | "needle" | "green"
  | "hut" | "hutRoof" | "hat" | "tree" | "trunk" | "scanner" | "led" | "paving"
  | "terracotta" | "glow" | "grass" | "hedge" | "crane" | "steel" | "lamp" | "car" | "tyre"
  | "brick" | "rebar" | "land" | "skyline";

/** grow: rises from its base · spread: widens from its centre · drop: falls into place · pop: scales up */
export type Anim = "grow" | "spread" | "drop" | "pop";

export type Part = {
  shape: "box" | "cyl" | "sphere" | "dome";
  /** Centre of the part's base (its bottom face). */
  at: V3;
  /** box: width, height, depth · cyl: radius, height · sphere/dome: radius */
  size: V3;
  mat: Mat;
  /** Seconds after "Build it" when it starts appearing, and how long that takes. */
  start: number;
  dur: number;
  anim: Anim;
  rot?: V3;
};

const FH = 1.1; // floor to floor
const SLAB = 0.12;
const COL = 0.24;
const FLOORS = 4;
export const ROOF = FLOORS * FH + SLAB; // top of the roof slab
const COLS_X = [-3, -1, 1, 3];
const COLS_Z = [-2, 0, 2];
const COLUMNS = COLS_X.flatMap((x) => COLS_Z.map((z) => [x, z] as const));

/** The build, in seconds after "Build it". */
export const T = {
  hut: 0.4,
  walls: 0.5,
  footings: 1.2,
  groundSlab: 1.7,
  floor: (f: number) => 2.0 + f * 0.55,
  glass: 4.2,
  roof: 4.5,
  site: 4.7,
  solar: 5.0,
  scanFrom: 6.1,
  scanTo: 7.1,
  end: 7.5,
};

/** The sketch takes this long to draw itself. */
export const SKETCH_SECONDS = 4.2;

export const PLINTH = { at: [2, -1.9, 0.5] as V3, size: [14.4, 1.9, 9.4] as V3 };

function diaphragmWalls(): Part[] {
  const parts: Part[] = [];
  const depth = 1.5;
  const t = 0.16;
  const along = 6.7;
  const across = 4.54;
  let i = 0;
  const add = (at: V3, size: V3) => parts.push({ shape: "box", at, size, mat: "foundation", anim: "drop", start: T.walls + i++ * 0.05, dur: 0.4 });
  for (const z of [2.35, -2.35])
    for (let k = 0; k < 6; k++) add([-along / 2 + (k + 0.5) * (along / 6), -depth, z], [along / 6 - 0.03, depth, t]);
  for (const x of [3.35, -3.35])
    for (let k = 0; k < 4; k++) add([x, -depth, -across / 2 + (k + 0.5) * (across / 4)], [t, depth, across / 4 - 0.03]);
  return parts;
}

function frame(): Part[] {
  const parts: Part[] = [];
  COLUMNS.forEach(([x, z], i) => {
    parts.push({ shape: "cyl", at: [x, -1.6, z], size: [0.07, 0.85, 0], mat: "foundation", anim: "grow", start: T.footings + i * 0.02, dur: 0.3 });
    parts.push({ shape: "box", at: [x, -0.75, z], size: [0.7, 0.25, 0.7], mat: "foundation", anim: "pop", start: T.footings + 0.2 + i * 0.02, dur: 0.3 });
    parts.push({ shape: "box", at: [x, -0.5, z], size: [COL, 0.5, COL], mat: "concrete", anim: "grow", start: T.footings + 0.4, dur: 0.3 });
  });
  parts.push({ shape: "box", at: [0, 0, 0], size: [6.5, SLAB, 4.5], mat: "concrete", anim: "spread", start: T.groundSlab, dur: 0.35 });
  for (let f = 0; f < FLOORS; f++) {
    for (const [x, z] of COLUMNS)
      parts.push({ shape: "box", at: [x, f * FH + SLAB, z], size: [COL, FH - SLAB, COL], mat: "concrete", anim: "grow", start: T.floor(f) + 0.2, dur: 0.35 });
    parts.push({ shape: "box", at: [0, (f + 1) * FH, 0], size: [6.5, SLAB, 4.5], mat: "concrete", anim: "spread", start: T.floor(f) + 0.4, dur: 0.3 });
  }
  return parts;
}

function skin(): Part[] {
  const parts: Part[] = [];
  const h = FH - SLAB;
  for (let f = 0; f < FLOORS; f++) {
    const y = f * FH + SLAB;
    const start = T.glass + f * 0.12;
    parts.push({ shape: "box", at: [0, y, 2], size: [5.76, h, 0.04], mat: "glass", anim: "grow", start, dur: 0.4 });
    parts.push({ shape: "box", at: [0, y, -2], size: [5.76, h, 0.04], mat: "glass", anim: "grow", start, dur: 0.4 });
    parts.push({ shape: "box", at: [-3, y, 0], size: [0.04, h, 3.76], mat: "glass", anim: "grow", start, dur: 0.4 });
    parts.push({ shape: "box", at: [3, y, 0], size: [0.04, h, 3.76], mat: "glass", anim: "grow", start, dur: 0.4 });
  }
  parts.push({ shape: "box", at: [0, SLAB, 2.03], size: [0.8, 0.85, 0.05], mat: "door", anim: "grow", start: T.glass, dur: 0.3 });
  // Rooms with their lights on, seen through the glass
  const lit: [number, number][] = [[0, 2], [1, -2], [1, 2], [2, 0], [3, -2], [3, 2]];
  lit.forEach(([f, x], k) =>
    parts.push({ shape: "box", at: [x, f * FH + SLAB + 0.06, -1.9], size: [1.7, h - 0.14, 0.03], mat: "glow", anim: "pop", start: T.glass + 0.5 + k * 0.08, dur: 0.3 }),
  );
  // Terracotta parapet round the roof
  const p = (at: V3, size: V3) => parts.push({ shape: "box", at, size, mat: "terracotta", anim: "grow", start: T.roof, dur: 0.3 });
  p([0, ROOF, 2.2], [6.5, 0.22, 0.1]);
  p([0, ROOF, -2.2], [6.5, 0.22, 0.1]);
  p([-3.2, ROOF, 0], [0.1, 0.22, 4.5]);
  p([3.2, ROOF, 0], [0.1, 0.22, 4.5]);
  return parts;
}

const SOLAR_X = [-2.2, -0.75, 0.75, 2.2];
const SOLAR_Z = [-1.3, 0, 1.3];

/** Things fixed to the building: the roof's solar panels, the NDT scanner and the green plaque. */
function fittings(): Part[] {
  const parts: Part[] = [];
  // Solar panels, tilted to face the sun (and the camera)
  let i = 0;
  for (const z of SOLAR_Z)
    for (const x of SOLAR_X)
      parts.push({ shape: "box", at: [x, ROOF + 0.12, z], size: [1.3, 0.05, 1.05], rot: [-0.35, 0, 0], mat: "solar", anim: "drop", start: T.solar + i++ * 0.06, dur: 0.35 });
  // NDT scanner on the right face
  parts.push({ shape: "box", at: [3.12, 2.35, 0.9], size: [0.14, 0.32, 0.42], mat: "scanner", anim: "pop", start: T.site + 0.4, dur: 0.3 });
  parts.push({ shape: "sphere", at: [3.2, 2.6, 1.0], size: [0.04, 0, 0], mat: "led", anim: "pop", start: T.site + 0.5, dur: 0.2 });
  parts.push({ shape: "box", at: [-0.65, 0.4, 2.06], size: [0.4, 0.34, 0.04], mat: "green", anim: "pop", start: T.site + 0.1, dur: 0.3 });
  return parts;
}

/** The plot round the building: forecourt and Vastu compass, site office, trees. */
function plot(): Part[] {
  const parts: Part[] = [];
  parts.push({ shape: "box", at: [0, 0, 3.4], size: [3.4, 0.015, 2.0], mat: "paving", anim: "spread", start: T.site, dur: 0.3 });
  parts.push({ shape: "cyl", at: [0, 0.015, 3.5], size: [0.5, 0.03, 0], mat: "brass", anim: "pop", start: T.site + 0.2, dur: 0.3 });
  parts.push({ shape: "box", at: [0, 0.045, 3.5], size: [0.06, 0.02, 0.8], mat: "needle", anim: "pop", start: T.site + 0.3, dur: 0.3 });
  // Site office with a hard hat on the roof
  parts.push({ shape: "box", at: [6.6, 0, 0.6], size: [1.9, 1.0, 1.2], mat: "hut", anim: "pop", start: T.hut, dur: 0.4 });
  parts.push({ shape: "box", at: [6.6, 1.0, 0.6], size: [2.05, 0.08, 1.35], mat: "hutRoof", anim: "pop", start: T.hut + 0.15, dur: 0.3 });
  parts.push({ shape: "box", at: [6.9, 0.45, 1.21], size: [0.7, 0.32, 0.02], mat: "glass", anim: "pop", start: T.hut + 0.2, dur: 0.3 });
  parts.push({ shape: "box", at: [6.0, 0, 1.21], size: [0.36, 0.75, 0.02], mat: "door", anim: "pop", start: T.hut + 0.2, dur: 0.3 });
  parts.push({ shape: "cyl", at: [7.1, 1.08, 0.85], size: [0.27, 0.02, 0], mat: "hat", anim: "pop", start: T.hut + 0.3, dur: 0.3 });
  parts.push({ shape: "dome", at: [7.1, 1.1, 0.85], size: [0.2, 0, 0], mat: "hat", anim: "pop", start: T.hut + 0.3, dur: 0.3 });
  // Model trees
  const trees: [number, number][] = [[-4.4, 3.8], [-4.3, -3.6], [8.6, 3.9], [4.3, -3.6], [-2.4, 4.6], [8.7, -0.7]];
  trees.forEach(([x, z], k) => {
    parts.push({ shape: "cyl", at: [x, 0, z], size: [0.05, 0.5, 0], mat: "trunk", anim: "grow", start: T.site + k * 0.08, dur: 0.3 });
    parts.push({ shape: "sphere", at: [x, 0.45, z], size: [0.45, 0, 0], mat: "tree", anim: "pop", start: T.site + 0.1 + k * 0.08, dur: 0.35 });
  });
  return parts;
}

/** Everything round the building: lawn, path, crane, ground-mounted solar, site life, and Jamshedpur on the horizon. */
function surroundings(): Part[] {
  const parts: Part[] = [];
  const add = (p: Omit<Part, "anim" | "dur"> & Partial<Pick<Part, "anim" | "dur">>) => parts.push({ anim: "pop", dur: 0.3, ...p });

  // The land runs to the horizon; the model's lawn sits on top of the plinth.
  add({ shape: "box", at: [0, -1.94, -6], size: [160, 0.02, 120], mat: "land", anim: "spread", start: 0, dur: 1.2 });
  add({ shape: "box", at: [PLINTH.at[0], -0.03, PLINTH.at[2]], size: [PLINTH.size[0] - 0.1, 0.026, PLINTH.size[2] - 0.1], mat: "grass", anim: "spread", start: 0.15, dur: 0.6 });

  // Path from the forecourt to the site office, hedges along the front, street lamps
  add({ shape: "box", at: [4.1, 0, 2.75], size: [4.8, 0.012, 0.55], mat: "paving", anim: "spread", start: T.site });
  add({ shape: "box", at: [6.0, 0, 1.95], size: [0.55, 0.012, 1.1], mat: "paving", anim: "spread", start: T.site });
  add({ shape: "box", at: [-3.7, 0, 4.95], size: [2.6, 0.28, 0.3], mat: "hedge", anim: "grow", start: T.site + 0.2 });
  for (const [x, z] of [[-2.0, 4.75], [2.0, 4.75], [5.0, 3.25]] as const) {
    add({ shape: "cyl", at: [x, 0, z], size: [0.025, 1.1, 0], mat: "steel", anim: "grow", start: T.site + 0.3 });
    add({ shape: "sphere", at: [x, 1.08, z], size: [0.07, 0, 0], mat: "lamp", start: T.site + 0.5 });
  }

  // A parked car
  add({ shape: "box", at: [4.3, 0.08, 4.0], size: [1.15, 0.26, 0.56], mat: "car", start: T.site + 0.4 });
  add({ shape: "box", at: [4.2, 0.34, 4.0], size: [0.62, 0.2, 0.5], mat: "glass", start: T.site + 0.45 });
  for (const [x, z] of [[3.9, 3.72], [4.7, 3.72], [3.9, 4.28], [4.7, 4.28]] as const)
    add({ shape: "cyl", at: [x, 0.07, z], size: [0.1, 0.06, 0], rot: [Math.PI / 2, 0, 0], mat: "tyre", start: T.site + 0.4 });

  // Site stock by the office: a brick pallet and a bundle of rebar
  add({ shape: "box", at: [7.9, 0, 0.0], size: [0.6, 0.32, 0.5], mat: "brick", start: T.hut + 0.4 });
  add({ shape: "box", at: [6.4, 0, -0.55], size: [1.6, 0.1, 0.28], mat: "rebar", start: T.hut + 0.45 });

  // Tower crane on the left, its jib over the building
  add({ shape: "box", at: [-4.5, 0, -1.4], size: [0.36, 6.2, 0.36], mat: "crane", anim: "grow", start: 0.25, dur: 1.0 });
  add({ shape: "box", at: [-4.5, 6.2, -1.4], size: [0.5, 0.4, 0.5], mat: "crane", start: 1.2 });
  add({ shape: "box", at: [-1.3, 6.6, -1.4], size: [6.4, 0.22, 0.22], mat: "crane", anim: "spread", start: 1.3, dur: 0.5 });
  add({ shape: "box", at: [-6.3, 6.6, -1.4], size: [2.6, 0.2, 0.22], mat: "crane", anim: "spread", start: 1.3, dur: 0.5 });
  add({ shape: "box", at: [-7.1, 6.25, -1.4], size: [0.7, 0.35, 0.4], mat: "concrete", start: 1.6 });
  add({ shape: "cyl", at: [1.4, 5.6, -1.4], size: [0.012, 1.0, 0], mat: "steel", anim: "grow", start: 1.7 });
  add({ shape: "box", at: [1.4, 5.4, -1.4], size: [0.18, 0.2, 0.18], mat: "crane", start: 1.8 });

  // Ground-mounted solar array behind the site office
  let i = 0;
  for (const z of [-3.4, -2.2]) {
    add({ shape: "box", at: [7.0, 0, z], size: [4.2, 0.2, 0.06], mat: "steel", anim: "spread", start: T.solar - 0.3 });
    for (const x of [5.6, 7.0, 8.4])
      add({ shape: "box", at: [x, 0.2, z], size: [1.25, 0.04, 0.75], rot: [-0.45, 0, 0], mat: "solar", anim: "drop", start: T.solar - 0.2 + i++ * 0.06, dur: 0.35 });
  }

  // Jamshedpur on the horizon: blocks and the steel plant's chimneys, fading into the haze
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let x = -60, k = 0; x < 70; k++) {
    const w = 2.4 + rand() * 3;
    add({ shape: "box", at: [x + w / 2, -1.92, -42 - rand() * 8], size: [w, 3 + rand() * 10, 2.5 + rand() * 3], mat: "skyline", anim: "grow", start: 0.6 + k * 0.015, dur: 0.5 });
    x += w + 0.6 + rand() * 2;
  }
  for (const [x, z] of [[24, -48], [28, -50], [-34, -46]] as const)
    add({ shape: "cyl", at: [x, -1.92, z], size: [0.6, 20, 0], mat: "skyline", anim: "grow", start: 0.9, dur: 0.6 });

  return parts;
}

/** The building itself: it sways and shows its stress in "Try to break it". */
export const buildingParts: Part[] = [...diaphragmWalls(), ...frame(), ...skin(), ...fittings()];
/** Everything round it, which stays put. */
export const siteParts: Part[] = [...plot(), ...surroundings()];

/**
 * Rebar cages for one floor, drawn as lines just inside each column before its concrete.
 * `positions` are relative to `base`, the floor's level, so the cages can grow up from it.
 */
export function cages(floor: number) {
  const s = (COL * 0.75) / 2;
  const h = FH - SLAB;
  const positions: number[] = [];
  for (const [x, z] of COLUMNS) {
    const corners: [number, number][] = [[x - s, z - s], [x + s, z - s], [x + s, z + s], [x - s, z + s]];
    for (const [cx, cz] of corners) positions.push(cx, 0, cz, cx, h, cz);
    for (const ty of [0.15, 0.4, 0.65, 0.9])
      corners.forEach(([ax, az], k) => {
        const [bx, bz] = corners[(k + 1) % 4];
        positions.push(ax, h * ty, az, bx, h * ty, bz);
      });
  }
  return { base: floor * FH + SLAB, positions, start: T.floor(floor), dur: 0.3 };
}

export const FLOOR_COUNT = FLOORS;

/** Edges of a box given by its base centre and size, without zero-length or repeated ones. */
function boxEdges(at: V3, size: V3): [V3, V3][] {
  const [x, y, z] = at;
  const [w, h, d] = size;
  const xs = [x - w / 2, x + w / 2];
  const ys = [y, y + h];
  const zs = [z - d / 2, z + d / 2];
  const c = (i: number, j: number, k: number): V3 => [xs[i], ys[j], zs[k]];
  const edges: [V3, V3][] = [];
  const seen = new Set<string>();
  const add = (a: V3, b: V3) => {
    const len = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
    const key = [a, b].map((p) => p.map((n) => n.toFixed(3)).join(",")).sort().join("|");
    if (len < 1e-4 || seen.has(key)) return;
    seen.add(key);
    edges.push([a, b]);
  };
  for (const j of [0, 1]) {
    add(c(0, j, 0), c(1, j, 0));
    add(c(1, j, 0), c(1, j, 1));
    add(c(1, j, 1), c(0, j, 1));
    add(c(0, j, 1), c(0, j, 0));
  }
  for (const i of [0, 1]) for (const k of [0, 1]) add(c(i, 0, k), c(i, 1, k));
  return edges;
}

/** The pencil sketch, in drawing order: site, foundations, frame, roof, panels, site office, dimensions. */
export function sketchSegments(): [V3, V3][] {
  const segs: [V3, V3][] = [];
  const box = (at: V3, size: V3) => segs.push(...boxEdges(at, size));
  box([PLINTH.at[0], 0, PLINTH.at[2]], [PLINTH.size[0], 0, PLINTH.size[2]]);
  box([0, -1.5, 0], [6.86, 1.5, 4.86]);
  for (const [x, z] of COLUMNS) segs.push([[x, -1.6, z], [x, -0.5, z]]);
  for (const [x, z] of COLUMNS) segs.push([[x, 0, z], [x, ROOF, z]]);
  for (let f = 0; f <= FLOORS; f++) box([0, f * FH, 0], [6.5, SLAB, 4.5]);
  box([0, ROOF, 0], [6.5, 0.22, 4.5]);
  box([0, SLAB, 2.03], [0.8, 0.85, 0]);
  for (const z of SOLAR_Z) for (const x of SOLAR_X) box([x, ROOF + 0.3, z], [1.3, 0, 0.8]);
  box([6.6, 0, 0.6], [1.9, 1.0, 1.2]);
  box([6.6, 1.0, 0.6], [2.05, 0.08, 1.35]);
  // Dimension lines with ticks: the width along the front and the height up the right corner.
  segs.push([[-3, 0, 3.0], [3, 0, 3.0]], [[-3.1, 0, 3.1], [-2.9, 0, 2.9]], [[2.9, 0, 3.1], [3.1, 0, 2.9]]);
  segs.push([[3.7, 0, 2], [3.7, ROOF, 2]], [[3.6, -0.1, 2], [3.8, 0.1, 2]], [[3.6, ROOF - 0.1, 2], [3.8, ROOF + 0.1, 2]]);
  return segs;
}

/**
 * The visitors' wall along the front right of the plot: one brick per visitor, laid in courses
 * from the left. `at` is the centre of its base; the camera looks at it from `focus`.
 */
export const VISITOR_WALL = {
  at: [7.3, 0, 4.95] as V3,
  length: 3.4,
  brick: [0.22, 0.09, 0.12] as V3,
  courses: 9,
  focus: { anchor: [7.3, 0.45, 4.95] as V3, dist: 7, from: [0.15, 0.45, 1] as V3 },
};

/** Where the dot sits and the camera looks for each part of the building. */
export const ANCHORS: Record<HotspotId, V3> = {
  hut: [6.6, 1.35, 0.6],
  foundation: [1.6, -0.8, 2.4],
  structure: [3, 1.65, 2],
  audit: [3.2, 2.55, 0.9],
  green: [-0.65, 0.75, 2.1],
  vastu: [0, 0.15, 3.5],
  solar: [0, ROOF + 0.4, 0],
};

/** How far away, and from which direction, the camera looks at each part. */
export const FOCUS: Record<HotspotId, { dist: number; from: V3 }> = {
  hut: { dist: 9, from: [0.2, 0.45, 1] },
  foundation: { dist: 11, from: [0.45, 0.25, 1] },
  structure: { dist: 11, from: [0.8, 0.35, 1] },
  audit: { dist: 9, from: [1, 0.3, 0.35] },
  green: { dist: 8, from: [0.2, 0.3, 1] },
  vastu: { dist: 8, from: [0.3, 0.9, 1] },
  solar: { dist: 13, from: [0.5, 1.1, 0.9] },
};

/**
 * The overview, framed for its card: the sketch sits left of the title block (bottom right),
 * the finished building sits right of the name card (bottom left).
 */
export const CAMERA = {
  fov: 32,
  sketch: { position: [8.4, 6.6, 21] as V3, target: [3.0, 1.1, 0] as V3 },
  built: { position: [13.4, 9.0, 16.8] as V3, target: [-1.4, 1.6, 0] as V3 },
};
