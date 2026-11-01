"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { clocks, useStore } from "@/lib/store";
import { T, VISITOR_WALL } from "./model";

const { at, length, brick, courses } = VISITOR_WALL;
const STEP = brick[0] + 0.02;
const PER_COURSE = Math.floor(length / STEP);
const MAX = PER_COURSE * courses;
const SHADES = ["#b5573a", "#a94f34", "#c0623f", "#9e4a31", "#b95c38"];

/** Brick n's place: courses from the bottom, left to right, every other course offset by half a brick. */
function brickMatrix(n: number, m: THREE.Matrix4) {
  const course = Math.floor(n / PER_COURSE);
  const i = n % PER_COURSE;
  const x = at[0] - length / 2 + STEP / 2 + i * STEP + (course % 2 ? STEP / 2 : 0);
  const y = at[1] + 0.06 + course * (brick[1] + 0.012) + brick[1] / 2;
  return m.makeTranslation(x, y, at[2]);
}

/** The visitors' wall: a footing, then one brick for every visitor who laid one. */
export function VisitorWall() {
  const count = useStore((s) => s.brickCount);
  const showTag = useStore((s) => s.phase === "built" && !s.panelOpen && !s.wallOpen && !s.test);
  const bricks = useRef<THREE.InstancedMesh>(null);
  const group = useRef<THREE.Group>(null);
  const shown = Math.min(count, MAX);
  const colors = useMemo(() => SHADES.map((c) => new THREE.Color(c)), []);

  useEffect(() => {
    const mesh = bricks.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    for (let n = 0; n < shown; n++) {
      mesh.setMatrixAt(n, brickMatrix(n, m));
      mesh.setColorAt(n, colors[n % colors.length]);
    }
    mesh.count = shown;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [shown, colors]);

  useFrame(() => {
    if (group.current) group.current.visible = clocks.build > T.site;
  });

  const open = () => useStore.getState().openWall();
  return (
    <group ref={group} visible={false}>
      {/* Footing */}
      <mesh position={[at[0], at[1] + 0.03, at[2]]} receiveShadow castShadow onClick={open}>
        <boxGeometry args={[length + 0.1, 0.06, brick[2] + 0.06]} />
        <meshStandardMaterial color="#9c8f7e" roughness={0.9} />
      </mesh>
      <instancedMesh ref={bricks} args={[undefined, undefined, MAX]} castShadow receiveShadow onClick={open}>
        <boxGeometry args={brick} />
        <meshStandardMaterial roughness={0.85} />
      </instancedMesh>
      {showTag ? (
        <Html position={[at[0], at[1] + 0.35 + Math.ceil(shown / PER_COURSE) * 0.1, at[2]]} center zIndexRange={[4, 0]}>
          <button type="button" className="wall-tag" onClick={open}>
            🧱 Visitors&apos; wall{count ? ` · ${count}` : ""}
          </button>
        </Html>
      ) : null}
    </group>
  );
}
