"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { clocks, useStore } from "@/lib/store";
import { SKETCH_SECONDS, sketchSegments } from "@/components/building/model";

const OVERSHOOT = 0.14; // architects run their lines a little past the corners
const WOBBLE = 0.025;

function seeded(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647 - 0.5;
  };
}

/** Each line twice: once with overshoot, once again slightly off, like a hand going over it. */
function pencilPositions() {
  const rand = seeded(42);
  const out: number[] = [];
  for (const [a, b] of sketchSegments()) {
    const A = new THREE.Vector3(...a);
    const B = new THREE.Vector3(...b);
    const dir = B.clone().sub(A).normalize().multiplyScalar(OVERSHOOT);
    out.push(...A.clone().sub(dir).toArray(), ...B.clone().add(dir).toArray());
    const j = () => new THREE.Vector3(rand(), rand(), rand()).multiplyScalar(WOBBLE * 2);
    out.push(...A.clone().add(j()).toArray(), ...B.clone().add(j()).toArray());
  }
  return new Float32Array(out);
}

/** A pencil whose tip is at its origin. */
function Pencil() {
  return (
    <group rotation={[0.35, 0, -0.55]}>
      <mesh position={[0, 0.07, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.05, 0.14, 6]} />
        <meshStandardMaterial color="#e3c19a" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.92, 6]} />
        <meshStandardMaterial color="#f2c230" roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.1, 0]}>
        <cylinderGeometry args={[0.052, 0.052, 0.08, 12]} />
        <meshStandardMaterial color="#e58c9a" roughness={0.9} />
      </mesh>
    </group>
  );
}

/** The building drawn in pencil. It draws itself, then fades as the real building rises (and back). */
export function SketchLines() {
  const positions = useMemo(() => pencilPositions(), []);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setDrawRange(0, 0);
    return g;
  }, [positions]);
  const mat = useRef<THREE.LineBasicMaterial>(null);
  const pencil = useRef<THREE.Group>(null);
  useEffect(() => () => geo.dispose(), [geo]);

  useFrame(() => {
    const s = useStore.getState();
    const verts = positions.length / 3;
    const k = Math.min(1, clocks.sketch / SKETCH_SECONDS);
    const drawn = Math.floor(k * verts / 2) * 2;
    geo.setDrawRange(0, drawn);
    if (k >= 1 && !s.sketchDone) s.finishSketch();

    if (mat.current) mat.current.opacity = 0.85 * (1 - Math.min(1, Math.max(0, (clocks.build - 1.2) / 2)));
    if (pencil.current) {
      pencil.current.visible = k < 1 && s.phase === "sketch";
      if (drawn > 0) pencil.current.position.fromArray(positions, (drawn - 1) * 3);
    }
  });

  return (
    <>
      <lineSegments geometry={geo}>
        <lineBasicMaterial ref={mat} color="#3a3f4a" transparent opacity={0.85} fog={false} />
      </lineSegments>
      <group ref={pencil} visible={false}>
        <Pencil />
      </group>
    </>
  );
}
