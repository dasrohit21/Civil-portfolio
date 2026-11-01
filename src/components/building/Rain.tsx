"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { clocks, useStore } from "@/lib/store";

const MAX_DROPS = 1400;
/** The box the rain falls in: the plot and a little round it. */
const AREA = { x: [-10, 15], z: [-8, 11], top: 14 };

const DROPS = (() => {
  let seed = 23;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  return Array.from({ length: MAX_DROPS }, () => ({
    x: AREA.x[0] + rand() * (AREA.x[1] - AREA.x[0]),
    z: AREA.z[0] + rand() * (AREA.z[1] - AREA.z[0]),
    phase: rand() * AREA.top,
    speed: 0.85 + rand() * 0.3,
  }));
})();

/**
 * Rain (or snow) falling over the site when it's raining in Jamshedpur. More drops the harder
 * it rains; a storm drives them sideways. Fewer drops on slow devices.
 */
export function Rain() {
  const lines = useRef<THREE.LineSegments>(null);
  const lowPower = useStore((s) => s.lowPower);
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(MAX_DROPS * 6), 3));
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame((state) => {
    const ls = lines.current;
    if (!ls) return;
    const attr = ls.geometry.getAttribute("position") as THREE.BufferAttribute;
    const positions = attr.array as Float32Array;
    const live = useStore.getState().live;
    const kind = live?.kind;
    const falling = (kind === "rain" || kind === "storm" || kind === "snow") && clocks.build > 2;
    ls.visible = falling;
    if (!falling || !live) return;

    const snow = kind === "snow";
    const count = Math.round(MAX_DROPS * (lowPower ? 0.4 : 1) * live.intensity);
    const speed = snow ? 1.6 : 16;
    const len = snow ? 0.05 : 0.38;
    const slant = kind === "storm" ? 0.35 : 0.08;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < MAX_DROPS; i++) {
      const d = DROPS[i];
      const o = i * 6;
      if (i >= count) {
        positions.fill(0, o, o + 6);
        continue;
      }
      const y = AREA.top - ((t * speed * d.speed + d.phase) % AREA.top);
      const x = d.x - slant * (AREA.top - y);
      positions[o] = x;
      positions[o + 1] = y;
      positions[o + 2] = d.z;
      positions[o + 3] = x + slant * len;
      positions[o + 4] = y + len;
      positions[o + 5] = d.z;
    }
    attr.needsUpdate = true;
    (ls.material as THREE.LineBasicMaterial).color.set(snow ? "#ffffff" : "#d6e4f2");
  });

  return (
    <lineSegments ref={lines} geometry={geometry} visible={false} frustumCulled={false}>
      <lineBasicMaterial color="#d6e4f2" transparent opacity={0.6} depthWrite={false} />
    </lineSegments>
  );
}
