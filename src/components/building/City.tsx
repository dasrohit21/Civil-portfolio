"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { clocks } from "@/lib/store";

/** City blocks on a 5 m grid, every fourth street an avenue. */
const CELL = 5;
const GROUND = -1.92;
const SHADES = ["#a08389", "#b09a8e", "#8f8a99", "#a7997f", "#9a8f94"];

type Block = { x: number; z: number; w: number; d: number; h: number; park: boolean };

/**
 * Jamshedpur round the site: low blocks near the plot, taller ones further off, streets between
 * and the odd park. The plot and a margin round it stay clear.
 */
const BLOCKS = (() => {
  let seed = 31;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const blocks: Block[] = [];
  for (let i = -11; i <= 12; i++) {
    for (let j = -7; j <= 7; j++) {
      if (i % 4 === 0 || j % 4 === 0) continue;
      const x = i * CELL, z = j * CELL;
      if (x > -16 && x < 20 && z > -14 && z < 16) continue;
      const far = Math.max(0, Math.hypot(x - 2, z) - 18) / 45;
      blocks.push({
        x: x + (rand() - 0.5),
        z: z + (rand() - 0.5),
        w: 2.4 + rand() * 1.8,
        d: 2.4 + rand() * 1.8,
        h: 0.4 + rand() * (0.6 + 3 * far),
        park: rand() < 0.1,
      });
    }
  }
  return blocks;
})();

export function City() {
  const buildings = useRef<THREE.InstancedMesh>(null);
  const parks = useRef<THREE.InstancedMesh>(null);
  const group = useRef<THREE.Group>(null);
  const colors = useMemo(() => SHADES.map((c) => new THREE.Color(c)), []);
  const counts = useMemo(() => ({ buildings: BLOCKS.filter((b) => !b.park).length, parks: BLOCKS.filter((b) => b.park).length }), []);

  useEffect(() => {
    const m = new THREE.Matrix4();
    let b = 0, p = 0;
    BLOCKS.forEach((block, n) => {
      if (block.park) {
        parks.current?.setMatrixAt(p++, m.makeScale(block.w, 0.04, block.d).setPosition(block.x, 0.02, block.z));
      } else {
        buildings.current?.setMatrixAt(b, m.makeScale(block.w, block.h, block.d).setPosition(block.x, block.h / 2, block.z));
        buildings.current?.setColorAt(b++, colors[n % colors.length]);
      }
    });
    for (const mesh of [buildings.current, parks.current]) {
      if (!mesh) continue;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
  }, [colors]);

  // The city grows with the site, and folds away with it.
  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const k = THREE.MathUtils.clamp((clocks.build - 0.6) / 0.8, 0, 1);
    g.visible = k > 0;
    g.scale.y = Math.max(0.001, 1 - Math.pow(1 - k, 3));
  });

  return (
    <group ref={group} position={[0, GROUND, 0]} visible={false}>
      <instancedMesh ref={buildings} args={[undefined, undefined, counts.buildings]}>
        <boxGeometry />
        <meshStandardMaterial roughness={1} />
      </instancedMesh>
      <instancedMesh ref={parks} args={[undefined, undefined, counts.parks]}>
        <boxGeometry />
        <meshStandardMaterial color="#7f9a5a" roughness={1} />
      </instancedMesh>
    </group>
  );
}
