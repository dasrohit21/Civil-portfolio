"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { clocks, useStore } from "@/lib/store";
import { FLOOR_COUNT, PLINTH, ROOF, T, buildingParts, cages, siteParts, type Mat, type Part } from "./model";
import { envelope, stressAt } from "./StressTest";

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const easeOut = (k: number) => 1 - Math.pow(1 - k, 3);
const backOut = (k: number) => 1 + 2.2 * Math.pow(k - 1, 3) + 1.2 * Math.pow(k - 1, 2);
const progress = (start: number, dur: number) => clamp01((clocks.build - start) / dur);

/** A PV module's face: aluminium frame, 6 × 5 cells, two busbars per cell. */
function solarCells() {
  const cols = 6, rows = 5, cell = 40, gap = 3, frame = 8;
  const canvas = document.createElement("canvas");
  canvas.width = frame * 2 + cols * cell + (cols - 1) * gap;
  canvas.height = frame * 2 + rows * cell + (rows - 1) * gap;
  const g = canvas.getContext("2d")!;
  g.fillStyle = "#b8bec7";
  g.fillRect(0, 0, canvas.width, canvas.height);
  g.fillStyle = "#8e9bb4";
  g.fillRect(frame, frame, canvas.width - frame * 2, canvas.height - frame * 2);
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const x = frame + c * (cell + gap), y = frame + r * (cell + gap);
      const shade = g.createLinearGradient(x, y, x + cell, y + cell);
      shade.addColorStop(0, "#2a4378");
      shade.addColorStop(1, "#18284f");
      g.fillStyle = shade;
      g.fillRect(x, y, cell, cell);
      g.fillStyle = "#5d72a0";
      g.fillRect(x + cell / 3 - 1, y, 1.5, cell);
      g.fillRect(x + (cell * 2) / 3 - 1, y, 1.5, cell);
    }
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  return map;
}

function useMaterials() {
  const mats = useMemo(() => {
    const std = (color: string, extra: THREE.MeshStandardMaterialParameters = {}) =>
      new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...extra });
    const glow = (color: string, intensity: number) => std("#2a1d10", { emissive: color, emissiveIntensity: intensity });
    const m: Record<Mat, THREE.MeshStandardMaterial> = {
      concrete: std("#e8dfcf"),
      foundation: std("#9c8f7e"),
      // Reflects the sunset (the scene's environment map).
      glass: std("#86aec6", { roughness: 0.05, metalness: 0.85, transparent: true, opacity: 0.5, depthWrite: false, envMapIntensity: 0.8 }),
      door: std("#115e59", { roughness: 0.5 }),
      solar: std("#ffffff", { map: solarCells(), roughness: 0.45, metalness: 0.2, envMapIntensity: 0.3 }),
      brass: std("#c08a3e", { roughness: 0.3, metalness: 0.8 }),
      needle: std("#c2412d"),
      green: std("#2f7a4a", { roughness: 0.5 }),
      hut: std("#f3efe6"),
      hutRoof: std("#0f766e"),
      hat: std("#f07a2a", { roughness: 0.45 }),
      tree: std("#7f9f55"),
      trunk: std("#7a5a3e"),
      scanner: std("#2b2f36", { roughness: 0.4 }),
      led: std("#ff4a3d", { emissive: "#ff4a3d", emissiveIntensity: 2.5 }),
      paving: std("#dccdb4"),
      terracotta: std("#b95c38", { roughness: 0.8 }),
      glow: glow("#ffb45e", 2.4),
      grass: std("#8aa55c", { roughness: 1 }),
      hedge: std("#5f7f3e", { roughness: 1 }),
      crane: std("#e8b130", { roughness: 0.55, metalness: 0.2 }),
      steel: std("#4a4d52", { roughness: 0.5, metalness: 0.6 }),
      lamp: glow("#ffd08a", 3),
      car: std("#a8322d", { roughness: 0.35, metalness: 0.4 }),
      tyre: std("#1d1d1f", { roughness: 0.9 }),
      brick: std("#b5573a"),
      rebar: std("#8a4b2a", { roughness: 0.6, metalness: 0.5 }),
      land: std("#a8956a", { roughness: 1 }),
      skyline: std("#a08389", { roughness: 1 }),
    };
    return m;
  }, []);
  useEffect(() => () => Object.values(mats).forEach((m) => (m.map?.dispose(), m.dispose())), [mats]);
  return mats;
}

function geometryOf(p: Part) {
  const [a, b, c] = p.size;
  switch (p.shape) {
    case "box":
      return { geo: <boxGeometry args={[a, b, c]} />, lift: b / 2 };
    case "cyl":
      return { geo: <cylinderGeometry args={[a, a, b, 28]} />, lift: b / 2 };
    case "sphere":
      return { geo: <sphereGeometry args={[a, 24, 16]} />, lift: a };
    case "dome":
      return { geo: <sphereGeometry args={[a, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />, lift: 0 };
  }
}

/** Stress colours for "Try to break it", low to high. */
const HEAT = ["#2b6cb0", "#2aa3b8", "#3fae6b", "#e6c229", "#ef8a2c", "#d6452f"];
/** The parts that carry load, and so show their stress. */
const STRUCTURAL = new Set<Mat>(["concrete", "foundation", "terracotta"]);

function useHeatMaterials() {
  const heat = useMemo(() => HEAT.map((color) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, emissive: color, emissiveIntensity: 0.25 })), []);
  useEffect(() => () => heat.forEach((m) => m.dispose()), [heat]);
  return heat;
}

/** Concrete seen through at the 1:20 "Steel" scale, so the rebar cages inside show. */
function useXrayMaterial() {
  const xray = useMemo(() => new THREE.MeshStandardMaterial({ color: "#cfd8dc", roughness: 0.4, transparent: true, opacity: 0.16, depthWrite: false }), []);
  useEffect(() => () => xray.dispose(), [xray]);
  return xray;
}

/**
 * One part of the building, appearing at its moment in the build. Structural parts show their
 * stress during a test, and turn see-through at the 1:20 scale.
 */
function PartMesh({ p, material, heat, xray }: { p: Part; material: THREE.Material; heat?: THREE.Material[]; xray?: THREE.Material }) {
  const group = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const { geo, lift } = geometryOf(p);
  const opaque = !(material as THREE.MeshStandardMaterial).transparent;

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const k = progress(p.start, p.dur);
    g.visible = k > 0;
    const e = Math.max(0.001, easeOut(k));
    if (p.anim === "grow") g.scale.set(1, e, 1);
    else if (p.anim === "spread") g.scale.set(e, 1, e);
    else if (p.anim === "pop") g.scale.setScalar(Math.max(0.001, backOut(k)));
    else g.position.y = p.at[1] + (1 - easeOut(k)) * 1.8;

    if (heat && mesh.current) {
      const { test, scale } = useStore.getState();
      const s = test ? stressAt(test, p.at[0], p.at[1] + lift) : 0;
      mesh.current.material =
        test && s > 0.04 ? heat[Math.min(heat.length - 1, Math.round(s * (heat.length - 1)))] : xray && scale === "detail" ? xray : material;
    }
  });

  return (
    <group ref={group} position={p.at} visible={false}>
      <mesh ref={mesh} position={[0, lift, 0]} rotation={p.rot} material={material} castShadow={opaque} receiveShadow={opaque}>
        {geo}
      </mesh>
    </group>
  );
}

function Cages() {
  const floors = useMemo(
    () =>
      Array.from({ length: FLOOR_COUNT }, (_, f) => {
        const c = cages(f);
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.Float32BufferAttribute(c.positions, 3));
        return { ...c, geo };
      }),
    [],
  );
  const groups = useRef<(THREE.Group | null)[]>([]);
  useEffect(() => () => floors.forEach((f) => f.geo.dispose()), [floors]);

  useFrame(() => {
    floors.forEach((f, i) => {
      const g = groups.current[i];
      if (!g) return;
      const k = progress(f.start, f.dur);
      g.visible = k > 0;
      g.scale.y = Math.max(0.001, easeOut(k));
    });
  });

  return (
    <>
      {floors.map((f, i) => (
        <group key={i} ref={(el) => void (groups.current[i] = el)} position={[0, f.base, 0]} visible={false}>
          <lineSegments geometry={f.geo}>
            <lineBasicMaterial color="#b5652b" />
          </lineSegments>
        </group>
      ))}
    </>
  );
}

/** The model's base: a clear acrylic block, so the foundations show through it. */
function Plinth() {
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const edges = useRef<THREE.LineBasicMaterial>(null);
  const edgeGeo = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(...PLINTH.size)), []);
  useEffect(() => () => edgeGeo.dispose(), [edgeGeo]);

  useFrame(() => {
    const k = easeOut(progress(0, 0.7));
    if (mat.current) mat.current.opacity = 0.3 * k;
    if (edges.current) edges.current.opacity = 0.6 * k;
  });

  const center: [number, number, number] = [PLINTH.at[0], PLINTH.at[1] + PLINTH.size[1] / 2, PLINTH.at[2]];
  return (
    <group position={center}>
      <mesh receiveShadow>
        <boxGeometry args={PLINTH.size} />
        <meshStandardMaterial ref={mat} color="#c4a27a" roughness={0.2} transparent opacity={0} depthWrite={false} />
      </mesh>
      <lineSegments geometry={edgeGeo}>
        <lineBasicMaterial ref={edges} color="#8b7f6a" transparent opacity={0} />
      </lineSegments>
    </group>
  );
}

/** The NDT scan: a beam of light that sweeps the building from roof to ground. */
function ScanBeam() {
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(() => {
    const k = progress(T.scanFrom, T.scanTo - T.scanFrom);
    if (!mesh.current || !mat.current) return;
    mesh.current.visible = k > 0 && k < 1;
    mesh.current.position.y = ROOF + 0.4 - k * (ROOF + 0.6);
    mat.current.opacity = 0.55 * Math.sin(Math.PI * k);
  });
  return (
    <mesh ref={mesh} visible={false}>
      <boxGeometry args={[7.2, 0.04, 5.2]} />
      <meshBasicMaterial ref={mat} color="#5fd4ff" transparent opacity={0} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

/** The building sways in an earthquake, leans in the wind and settles a hair under load. */
function useSway() {
  const structure = useRef<THREE.Group>(null);
  useFrame(() => {
    const g = structure.current;
    if (!g) return;
    const test = useStore.getState().test;
    const env = test ? envelope() : 0;
    const t = clocks.test;
    g.position.x = test === "quake" ? Math.sin(t * 16) * 0.07 * env : 0;
    g.rotation.z = test === "wind" ? -0.014 * env * (1 + 0.3 * Math.sin(t * 2.5)) : 0;
    g.scale.y = test === "load" ? 1 - 0.008 * env : 1;
  });
  return structure;
}

export function Building() {
  const mats = useMaterials();
  const heat = useHeatMaterials();
  const xray = useXrayMaterial();
  const structure = useSway();
  return (
    <group>
      <Plinth />
      <group ref={structure}>
        {buildingParts.map((p, i) => (
          <PartMesh key={i} p={p} material={mats[p.mat]} heat={STRUCTURAL.has(p.mat) ? heat : undefined} xray={STRUCTURAL.has(p.mat) ? xray : undefined} />
        ))}
        <Cages />
      </group>
      {siteParts.map((p, i) => (
        <PartMesh key={i} p={p} material={mats[p.mat]} />
      ))}
      <ScanBeam />
    </group>
  );
}
