"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { clocks } from "@/lib/store";
import { FLOOR_COUNT, PLINTH, ROOF, T, cages, parts, type Mat, type Part } from "./model";

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const easeOut = (k: number) => 1 - Math.pow(1 - k, 3);
const backOut = (k: number) => 1 + 2.2 * Math.pow(k - 1, 3) + 1.2 * Math.pow(k - 1, 2);
const progress = (start: number, dur: number) => clamp01((clocks.build - start) / dur);

function useMaterials() {
  const mats = useMemo(() => {
    const std = (color: string, extra: THREE.MeshStandardMaterialParameters = {}) =>
      new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...extra });
    const m: Record<Mat, THREE.MeshStandardMaterial> = {
      concrete: std("#d9d4ca"),
      foundation: std("#a8a196"),
      glass: std("#9fc3d6", { roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.38, depthWrite: false }),
      door: std("#3b3f46", { roughness: 0.5 }),
      solar: std("#1f3a63", { roughness: 0.25, metalness: 0.5 }),
      brass: std("#c08a3e", { roughness: 0.35, metalness: 0.7 }),
      needle: std("#c2412d"),
      green: std("#3f7d4e", { roughness: 0.5 }),
      hut: std("#eef0f2"),
      hutRoof: std("#2d5b9a"),
      hat: std("#e8692c", { roughness: 0.45 }),
      tree: std("#9cb88c"),
      trunk: std("#8a7258"),
      scanner: std("#2b2f36", { roughness: 0.4 }),
      led: std("#ff4a3d", { emissive: "#ff4a3d", emissiveIntensity: 2.5 }),
      paving: std("#e4ddcf"),
    };
    return m;
  }, []);
  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);
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

/** One part of the building, appearing at its moment in the build. */
function PartMesh({ p, material }: { p: Part; material: THREE.Material }) {
  const group = useRef<THREE.Group>(null);
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
  });

  return (
    <group ref={group} position={p.at} visible={false}>
      <mesh position={[0, lift, 0]} rotation={p.rot} material={material} castShadow={opaque} receiveShadow={opaque}>
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
        <meshStandardMaterial ref={mat} color="#cbbfa8" roughness={0.2} transparent opacity={0} depthWrite={false} />
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

export function Building() {
  const mats = useMaterials();
  return (
    <group>
      <Plinth />
      {parts.map((p, i) => (
        <PartMesh key={i} p={p} material={mats[p.mat]} />
      ))}
      <Cages />
      <ScanBeam />
    </group>
  );
}
