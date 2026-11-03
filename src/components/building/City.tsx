"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { clocks, useStore } from "@/lib/store";
import { daylight } from "./daylight";

/**
 * Jamshedpur round the site: city blocks on a 5 m grid with streets between, avenues every
 * fourth line with traffic, parks with trees, and buildings with windows (lit at night),
 * setbacks and rooftop tanks. Each kind of thing is one instanced mesh.
 */
const CELL = 5;
const GROUND = -1.92;
const CITY = { x: [-57.5, 62.5], z: [-37.5, 37.5] } as const;
/** The blocks the plot (and its crane) takes up. */
const CLEAR = { x: [-7.5, 12.5], z: [-7.5, 7.5] } as const;
const AVENUE = 3.2;
const SHADES = ["#cfc6b8", "#b9ae9d", "#ddd3c3", "#aaa49b", "#c7ab90", "#a3abb1", "#c2b5a4", "#b98f78"];
const CAR_COLORS = ["#c0392b", "#f1f1ee", "#2d3436", "#2f6db5", "#e1b12c", "#7f8c8d", "#e7e2d6", "#1e8449"];

type Box = { x: number; y: number; z: number; w: number; h: number; d: number };
type Lane = { along: "x" | "z"; at: number; from: number; to: number; dir: 1 | -1 };

const inClear = (x: number, z: number) => x > CLEAR.x[0] && x < CLEAR.x[1] && z > CLEAR.z[0] && z < CLEAR.z[1];

/** Everything that stands still, laid out once from a fixed seed so it's the same every visit. */
const LAYOUT = (() => {
  let seed = 31;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const buildings: Box[] = [], tops: Box[] = [], walks: Box[] = [], parks: Box[] = [], trees: Box[] = [];
  for (let i = -11; i <= 12; i++) {
    for (let j = -7; j <= 7; j++) {
      if (i % 4 === 0 || j % 4 === 0) continue;
      const x = i * CELL, z = j * CELL;
      if (inClear(x, z)) continue;
      if (rand() < 0.1) {
        parks.push({ x, y: 0.03, z, w: 4.4, h: 0.06, d: 4.4 });
        for (let t = 0; t < 4; t++) trees.push({ x: x + (rand() - 0.5) * 3.4, y: 0.45, z: z + (rand() - 0.5) * 3.4, w: 0.7, h: 0.7, d: 0.7 });
        continue;
      }
      walks.push({ x, y: 0.03, z, w: 4.6, h: 0.06, d: 4.6 });
      const far = Math.max(0, Math.hypot(x - 2, z) - 18) / 45;
      // One building filling the block, or two side by side.
      const pair = rand() < 0.35;
      for (let k = 0; k < (pair ? 2 : 1); k++) {
        const w = pair ? 1.7 + rand() * 0.3 : 2.8 + rand() * 1.2;
        const d = 2.8 + rand() * 1.2;
        const bx = pair ? x + (k ? 1.05 : -1.05) : x;
        const h = 0.5 + rand() * (0.7 + 3.4 * far);
        buildings.push({ x: bx, y: 0.06 + h / 2, z, w, h, d });
        // Taller towers step back near the top.
        if (h > 2.2) {
          const sh = 0.4 + rand() * 0.9;
          buildings.push({ x: bx, y: 0.06 + h + sh / 2, z, w: w * 0.62, h: sh, d: d * 0.62 });
        }
        // Water tanks and plant on the roof.
        if (h > 0.9 && rand() < 0.7) {
          const top = 0.06 + h;
          tops.push({ x: bx + (rand() - 0.5) * w * 0.5, y: top + 0.12, z: z + (rand() - 0.5) * d * 0.5, w: 0.35, h: 0.24, d: 0.35 });
          tops.push({ x: bx + (rand() - 0.5) * w * 0.5, y: top + 0.07, z: z + (rand() - 0.5) * d * 0.5, w: 0.5, h: 0.14, d: 0.3 });
        }
      }
    }
  }

  // Avenues, kept off the open land round the plot, with dashed centre lines and two lanes.
  const roads: Box[] = [], dashes: Box[] = [], lanes: Lane[] = [];
  const avenue = (along: "x" | "z", at: number, from: number, to: number) => {
    const len = to - from, mid = (from + to) / 2;
    roads.push(along === "x" ? { x: mid, y: 0.015, z: at, w: len, h: 0.03, d: AVENUE } : { x: at, y: 0.015, z: mid, w: AVENUE, h: 0.03, d: len });
    for (let s = from + 1; s < to - 1; s += 2.2)
      dashes.push(along === "x" ? { x: s, y: 0.035, z: at, w: 0.9, h: 0.01, d: 0.09 } : { x: at, y: 0.035, z: s, w: 0.09, h: 0.01, d: 0.9 });
    lanes.push({ along, at: at - 0.75, from, to, dir: 1 }, { along, at: at + 0.75, from, to, dir: -1 });
  };
  for (const x of [-40, -20, 20, 40, 60]) avenue("z", x, CITY.z[0], CITY.z[1]);
  avenue("z", 0, CITY.z[0], CLEAR.z[0]);
  avenue("z", 0, CLEAR.z[1], CITY.z[1]);
  for (const z of [-20, 20]) avenue("x", z, CITY.x[0], CITY.x[1]);
  avenue("x", 0, CITY.x[0], CLEAR.x[0]);
  avenue("x", 0, CLEAR.x[1], CITY.x[1]);

  const cars = lanes.flatMap((lane, l) =>
    Array.from({ length: Math.max(2, Math.round((lane.to - lane.from) / 18)) }, () => ({
      lane: l,
      offset: rand() * (lane.to - lane.from),
      speed: 2 + rand() * 1.8,
      color: CAR_COLORS[Math.floor(rand() * CAR_COLORS.length)],
    })),
  );

  // The city's floor: streets everywhere (the plot's plinth stands on it).
  const floor: Box[] = [{ x: 2.5, y: 0.005, z: 0, w: CITY.x[1] - CITY.x[0], h: 0.01, d: CITY.z[1] - CITY.z[0] }];
  return { buildings, tops, walks, parks, trees, roads, dashes, floor, lanes, cars };
})();

/** How dark it is, for the lit windows (the scene has one city). */
const NIGHT = { value: 0 };

/** Windows on every wall, a floor every 0.36 m; at night some of them are lit. */
function withWindows(material: THREE.MeshStandardMaterial, night: { value: number }) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uNight = night;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vCityPos;\nvarying vec3 vCityNormal;")
      .replace(
        "#include <project_vertex>",
        `#include <project_vertex>
        vCityPos = (modelMatrix * instanceMatrix * vec4(position, 1.0)).xyz;
        vCityNormal = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vCityPos;\nvarying vec3 vCityNormal;\nuniform float uNight;")
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        float wall = 1.0 - step(0.5, abs(vCityNormal.y));
        vec2 f = vec2(abs(vCityNormal.x) > 0.5 ? vCityPos.z : vCityPos.x, vCityPos.y + 1.86);
        vec2 cell = fract(f / vec2(0.3, 0.36));
        float win = wall * step(0.2, cell.x) * step(cell.x, 0.8) * step(0.32, cell.y) * step(cell.y, 0.82) * step(0.3, f.y);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.2, 0.24, 0.3), win * 0.8);
        float lit = step(0.55, fract(sin(dot(floor(f / vec2(0.3, 0.36)), vec2(12.9898, 78.233))) * 43758.5453));`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        "#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(1.0, 0.78, 0.45) * win * lit * uNight * 1.6;",
      );
  };
  return material;
}

function place(mesh: THREE.InstancedMesh | null, boxes: Box[], colors?: THREE.Color[]) {
  if (!mesh) return;
  const m = new THREE.Matrix4();
  boxes.forEach((b, n) => {
    mesh.setMatrixAt(n, m.makeScale(b.w, b.h, b.d).setPosition(b.x, b.y, b.z));
    if (colors) mesh.setColorAt(n, colors[n % colors.length]);
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();
}

/** A small car: body and cabin, 0.8 m long, pointing along +x. */
function carGeometry() {
  const body = new THREE.BoxGeometry(0.8, 0.16, 0.36).translate(0, 0.12, 0);
  const cabin = new THREE.BoxGeometry(0.42, 0.13, 0.32).translate(-0.04, 0.265, 0);
  const car = mergeGeometries([body, cabin])!;
  body.dispose();
  cabin.dispose();
  return car;
}

export function City() {
  const group = useRef<THREE.Group>(null);
  const buildings = useRef<THREE.InstancedMesh>(null);
  const tops = useRef<THREE.InstancedMesh>(null);
  const walks = useRef<THREE.InstancedMesh>(null);
  const parks = useRef<THREE.InstancedMesh>(null);
  const trees = useRef<THREE.InstancedMesh>(null);
  const roads = useRef<THREE.InstancedMesh>(null);
  const dashes = useRef<THREE.InstancedMesh>(null);
  const floor = useRef<THREE.InstancedMesh>(null);
  const cars = useRef<THREE.InstancedMesh>(null);

  const wallMaterial = useMemo(() => withWindows(new THREE.MeshStandardMaterial({ roughness: 0.95 }), NIGHT), []);
  const car = useMemo(() => carGeometry(), []);
  useEffect(
    () => () => {
      wallMaterial.dispose();
      car.dispose();
    },
    [wallMaterial, car],
  );

  useEffect(() => {
    place(buildings.current, LAYOUT.buildings, SHADES.map((c) => new THREE.Color(c)));
    place(tops.current, LAYOUT.tops);
    place(walks.current, LAYOUT.walks);
    place(parks.current, LAYOUT.parks);
    place(trees.current, LAYOUT.trees);
    place(roads.current, LAYOUT.roads);
    place(dashes.current, LAYOUT.dashes);
    place(floor.current, LAYOUT.floor);
    const mesh = cars.current;
    if (!mesh) return;
    LAYOUT.cars.forEach((c, n) => mesh.setColorAt(n, new THREE.Color(c.color)));
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.frustumCulled = false; // they move, so their bounds keep changing
  }, []);

  const m = useMemo(() => new THREE.Matrix4(), []);
  const turn = useMemo(() => new THREE.Matrix4(), []);
  useFrame((state) => {
    const g = group.current;
    if (!g) return;
    // The city grows with the site, and folds away with it.
    const k = THREE.MathUtils.clamp((clocks.build - 0.6) / 0.8, 0, 1);
    g.visible = k > 0;
    g.scale.y = Math.max(0.001, 1 - Math.pow(1 - k, 3));
    NIGHT.value = daylight.night;
    const mesh = cars.current;
    if (!g.visible || !mesh) return;
    const t = useStore.getState().reducedMotion ? 0 : state.clock.elapsedTime;
    LAYOUT.cars.forEach((c, n) => {
      const lane = LAYOUT.lanes[c.lane];
      const len = lane.to - lane.from;
      const s = (c.offset + t * c.speed) % len;
      const along = lane.dir === 1 ? lane.from + s : lane.to - s;
      const angle = (lane.along === "x" ? 0 : -Math.PI / 2) + (lane.dir === 1 ? 0 : Math.PI);
      turn.makeRotationY(angle);
      m.copy(turn).setPosition(lane.along === "x" ? along : lane.at, 0.03, lane.along === "x" ? lane.at : along);
      mesh.setMatrixAt(n, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  const L = LAYOUT;
  return (
    <group ref={group} position={[0, GROUND, 0]} visible={false}>
      <instancedMesh ref={floor} args={[undefined, undefined, L.floor.length]} receiveShadow>
        <boxGeometry />
        <meshStandardMaterial color="#86837c" roughness={1} />
      </instancedMesh>
      <instancedMesh ref={walks} args={[undefined, undefined, L.walks.length]}>
        <boxGeometry />
        <meshStandardMaterial color="#c9c2b4" roughness={1} />
      </instancedMesh>
      <instancedMesh ref={roads} args={[undefined, undefined, L.roads.length]}>
        <boxGeometry />
        <meshStandardMaterial color="#5c5a56" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={dashes} args={[undefined, undefined, L.dashes.length]}>
        <boxGeometry />
        <meshStandardMaterial color="#f3eee3" roughness={0.8} />
      </instancedMesh>
      <instancedMesh ref={parks} args={[undefined, undefined, L.parks.length]}>
        <boxGeometry />
        <meshStandardMaterial color="#7f9a5a" roughness={1} />
      </instancedMesh>
      <instancedMesh ref={trees} args={[undefined, undefined, L.trees.length]}>
        <sphereGeometry args={[0.5, 10, 8]} />
        <meshStandardMaterial color="#6f8f4a" roughness={1} />
      </instancedMesh>
      <instancedMesh ref={buildings} args={[undefined, undefined, L.buildings.length]} material={wallMaterial}>
        <boxGeometry />
      </instancedMesh>
      <instancedMesh ref={tops} args={[undefined, undefined, L.tops.length]}>
        <boxGeometry />
        <meshStandardMaterial color="#8d9196" roughness={0.7} metalness={0.2} />
      </instancedMesh>
      <instancedMesh ref={cars} args={[car, undefined, L.cars.length]}>
        <meshStandardMaterial roughness={0.4} metalness={0.3} />
      </instancedMesh>
    </group>
  );
}
