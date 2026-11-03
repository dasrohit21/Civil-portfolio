"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { StressTestId } from "@/content/types";
import { clocks, useStore } from "@/lib/store";
import { PLINTH, ROOF } from "./model";
import { Label } from "./Label";

/**
 * "Try to break it". These are effects, not a structural analysis: the heatmap shows where a real
 * building would carry the most stress in each test, and the building always holds.
 */
export const TEST_SECONDS = 4.6;

const smooth = (k: number) => THREE.MathUtils.smoothstep(k, 0, 1);

/** How hard the test is pushing right now, 0..1: it builds up, holds, then eases off. */
export function envelope(t = clocks.test) {
  if (t < 0.7) return smooth(t / 0.7);
  if (t < 3.7) return 1;
  return 1 - smooth((t - 3.7) / 0.9);
}

/** Stress at a point of the structure, 0 (none) to 1 (high), for the running test. */
export function stressAt(test: StressTestId, x: number, y: number) {
  const env = envelope();
  const h = THREE.MathUtils.clamp(y / ROOF, 0, 1);
  switch (test) {
    case "load":
      return env * (0.25 + 0.65 * (1 - h));
    case "quake":
      return env * (0.2 + 0.7 * (1 - h)) * (0.8 + 0.2 * Math.abs(Math.sin(clocks.test * 14)));
    case "wind":
      // Wind from the left: the windward side and the upper floors work hardest.
      return env * (0.2 + 0.45 * h + (x < 0 ? 0.25 : 0));
    case "flood":
      return env * (y < 0.7 ? 0.9 : 0.15);
  }
}

/** Steel weights that drop onto the roof, and lift away again. */
function Weights() {
  const group = useRef<THREE.Group>(null);
  const label = useRef<HTMLDivElement>(null);
  useFrame(() => {
    const on = useStore.getState().test === "load";
    if (!group.current) return;
    group.current.visible = on;
    if (!on) return;
    const t = clocks.test;
    const drop = t < 0.6 ? 1 - smooth(t / 0.6) : t > 3.9 ? smooth((t - 3.9) / 0.6) : 0;
    group.current.position.y = ROOF + 0.22 + drop * 7;
    if (label.current) label.current.style.opacity = drop < 0.05 ? "1" : "0";
  });
  return (
    <group ref={group} visible={false}>
      {[-1.8, 0, 1.8].map((x) => (
        <mesh key={x} position={[x, 0.3, 0]} castShadow>
          <boxGeometry args={[0.9, 0.6, 0.9]} />
          <meshStandardMaterial color="#3d4148" roughness={0.4} metalness={0.7} />
        </mesh>
      ))}
      <Label position={[0, 1.1, 0]} zIndex={4}>
        <div ref={label} className="test-tag">3 × 50 t</div>
      </Label>
    </group>
  );
}

/** Where the wind streaks fly: the same every time. */
const STREAKS = (() => {
  let seed = 11;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  return Array.from({ length: 36 }, () => ({ y: 0.4 + rand() * 6, z: -3.5 + rand() * 8, offset: rand() * 24, len: 0.6 + rand() * 1.2 }));
})();

/** Streaks of wind blowing across from the left. */
function Wind() {
  const streaks = STREAKS;
  const material = useMemo(() => new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0, depthWrite: false }), []);
  useEffect(() => () => material.dispose(), [material]);
  const group = useRef<THREE.Group>(null);
  useFrame(() => {
    const on = useStore.getState().test === "wind";
    const g = group.current;
    if (!g) return;
    g.visible = on;
    if (!on) return;
    ((g.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.7 * envelope();
    g.children.forEach((m, i) => {
      const s = streaks[i];
      m.position.set(((clocks.test * 11 + s.offset) % 24) - 12, s.y, s.z);
    });
  });
  return (
    <group ref={group} visible={false}>
      {streaks.map((s, i) => (
        <mesh key={i} material={material}>
          <boxGeometry args={[s.len, 0.025, 0.025]} />
        </mesh>
      ))}
    </group>
  );
}

/** Flood water rising over the plot, then draining away. */
function Flood() {
  const group = useRef<THREE.Group>(null);
  useFrame(() => {
    const on = useStore.getState().test === "flood";
    if (!group.current) return;
    group.current.visible = on;
    if (on) group.current.scale.y = Math.max(0.001, envelope());
  });
  // The group sits at ground level and scales up, so the water rises from the ground.
  return (
    <group ref={group} position={[PLINTH.at[0], -0.05, PLINTH.at[2]]} visible={false}>
      <mesh position={[0, 0.4, 0]}>
        <boxGeometry args={[PLINTH.size[0] - 0.05, 0.8, PLINTH.size[2] - 0.05]} />
        <meshStandardMaterial color="#3f86b8" roughness={0.1} metalness={0.3} transparent opacity={0.55} depthWrite={false} />
      </mesh>
    </group>
  );
}

export function StressEffects() {
  return (
    <>
      <Weights />
      <Wind />
      <Flood />
    </>
  );
}
