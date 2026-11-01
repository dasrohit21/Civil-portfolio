"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { clocks, useStore } from "@/lib/store";
import { ANCHORS, CAMERA, FOCUS, SKETCH_SECONDS, T } from "./model";
import { SUN_DIRECTION } from "./Sky";
import { TEST_SECONDS, envelope } from "./StressTest";

const UP = new THREE.Vector3(0, 1, 0);
const SUN_POSITION = SUN_DIRECTION.clone().multiplyScalar(18).toArray();

const v = (a: readonly number[]) => new THREE.Vector3(a[0], a[1], a[2]);
const smooth = (k: number) => k * k * (3 - 2 * k);

/** Runs the sketch and build clocks, moves the camera, and lights the model. */
export function Rig() {
  const look = useRef(v(CAMERA.sketch.target));

  useFrame((state, delta) => {
    const camera = state.camera;
    const s = useStore.getState();
    const dt = Math.min(delta, 0.05);

    // Clocks
    if (s.phase === "sketch") clocks.sketch = s.sketchDone || s.reducedMotion ? SKETCH_SECONDS : clocks.sketch + dt;
    if (s.phase === "building") {
      clocks.build += dt * (s.reducedMotion ? 20 : 1);
      if (clocks.build >= T.end) {
        clocks.build = T.end;
        s.finishBuild();
      }
    }
    if (s.phase === "printing") {
      clocks.build -= dt * (s.reducedMotion ? 30 : 3);
      if (clocks.build <= 0) {
        clocks.build = 0;
        s.finishPrint();
      }
    }
    if (s.test) {
      clocks.test += dt;
      if (clocks.test >= TEST_SECONDS) s.finishTest();
    }
    const built = Math.min(1, clocks.build / T.end);

    // Camera: the overview (from the front while it's a sketch), or the part that's open.
    const tall = state.size.width < state.size.height * 0.95;
    let tgt = v(CAMERA.sketch.target).lerp(v(CAMERA.built.target), smooth(built));
    let pos = v(CAMERA.sketch.position).lerp(v(CAMERA.built.position), smooth(built));
    if (tall) {
      // Phones: aim between the building and the site office, step back so both fit the narrow
      // screen, and keep them above the card at the bottom.
      const offset = pos.sub(tgt).multiplyScalar(1.9);
      tgt.x = 1.2 + 1.2 * smooth(built);
      pos = tgt.clone().add(offset);
      tgt.y -= 3;
    }
    if (s.focus) {
      const { dist, from } = FOCUS[s.focus];
      tgt = v(ANCHORS[s.focus]);
      pos = tgt.clone().add(v(from).normalize().multiplyScalar(tall ? dist * 1.35 : dist));
      if (!tall && s.panelOpen) {
        // Keep the part visible to the left of the side panel.
        const right = tgt.clone().sub(pos).normalize().cross(UP).normalize();
        tgt.add(right.multiplyScalar(dist * 0.22));
      }
      // Phones: the card or sheet covers the bottom, so show the part in the top half.
      if (tall && (s.panelOpen || s.touring)) tgt.y -= dist * 0.12;
    } else if (!tall && !s.reducedMotion && s.phase === "built") {
      pos.x += state.pointer.x * 0.5;
      pos.y += state.pointer.y * 0.3;
    }

    const speed = s.reducedMotion ? 60 : s.focus ? 2.4 : 1.6;
    camera.position.x = THREE.MathUtils.damp(camera.position.x, pos.x, speed, dt);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, pos.y, speed, dt);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, pos.z, speed, dt);
    look.current.x = THREE.MathUtils.damp(look.current.x, tgt.x, speed, dt);
    look.current.y = THREE.MathUtils.damp(look.current.y, tgt.y, speed, dt);
    look.current.z = THREE.MathUtils.damp(look.current.z, tgt.z, speed, dt);
    camera.lookAt(look.current);
    // The earthquake shakes the camera too.
    if (s.test === "quake" && !s.reducedMotion) {
      const shake = 0.06 * envelope();
      camera.position.x += Math.sin(clocks.test * 37) * shake;
      camera.position.y += Math.cos(clocks.test * 29) * shake * 0.6;
    }
  });

  const lowPower = useStore((s) => s.lowPower);
  return (
    <>
      {/* Golden hour: warm sky above, green bounce from the lawn below */}
      <hemisphereLight args={["#ffd8b0", "#6b7a4c", 0.55]} />
      <ambientLight intensity={0.12} />
      {/* The low sun, front left: long shadows, warm faces */}
      <directionalLight
        position={SUN_POSITION}
        intensity={3.2}
        color="#ffb46b"
        castShadow={!lowPower}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
        shadow-camera-far={60}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
      />
      {/* Cool light from the evening sky on the shaded side */}
      <directionalLight position={[12, 7, -6]} intensity={0.6} color="#9db4ff" />
    </>
  );
}
