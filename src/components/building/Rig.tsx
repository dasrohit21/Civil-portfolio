"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import type { WeatherKind } from "@/content/types";
import { clocks, fx, useStore } from "@/lib/store";
import { ANCHORS, CAMERA, FOCUS, SKETCH_SECONDS, T, VISITOR_WALL } from "./model";
import { CLOUDED, SUNSET, SUN_DIRECTION } from "./Sky";
import { TEST_SECONDS, envelope } from "./StressTest";

const UP = new THREE.Vector3(0, 1, 0);
const SUN_POSITION = SUN_DIRECTION.clone().multiplyScalar(18).toArray();
const SUN_WARM = new THREE.Color("#ffb46b");
const SUN_CLOUDED = new THREE.Color("#d9dde4");
const FOG_CLEAR = new THREE.Color(SUNSET.horizon);
const FOG_CLOUDED = new THREE.Color(CLOUDED.horizon);

/** How grey and how foggy each kind of weather makes the scene. */
const LOOK: Record<WeatherKind, { grey: number; fog: number }> = {
  clear: { grey: 0, fog: 0 },
  cloudy: { grey: 0.35, fog: 0.1 },
  overcast: { grey: 0.6, fog: 0.25 },
  fog: { grey: 0.5, fog: 1 },
  rain: { grey: 0.75, fog: 0.5 },
  storm: { grey: 0.92, fog: 0.55 },
  snow: { grey: 0.6, fog: 0.5 },
};

/** Ease the scene towards Jamshedpur's weather, and throw the odd bolt of lightning in a storm. */
function updateWeather(kind: WeatherKind, dt: number) {
  const look = LOOK[kind];
  fx.grey = THREE.MathUtils.damp(fx.grey, look.grey, 1.2, dt);
  fx.fog = THREE.MathUtils.damp(fx.fog, look.fog, 1.2, dt);
  if (kind === "storm" && Math.random() < dt * 0.3) fx.flash = 0.9;
  fx.flash = THREE.MathUtils.damp(fx.flash, 0, 7, dt);
}

const v = (a: readonly number[]) => new THREE.Vector3(a[0], a[1], a[2]);
const smooth = (k: number) => k * k * (3 - 2 * k);

/** Runs the sketch and build clocks, moves the camera, and lights the model. */
export function Rig() {
  const look = useRef(v(CAMERA.sketch.target));
  const sun = useRef<THREE.DirectionalLight>(null);
  const sky = useRef<THREE.HemisphereLight>(null);

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

    // Weather: only once the building has risen out of the paper.
    updateWeather(clocks.build > 1 ? (s.live?.kind ?? "clear") : "clear", dt);
    if (sun.current) {
      sun.current.intensity = 3.2 * (1 - 0.72 * fx.grey);
      sun.current.color.lerpColors(SUN_WARM, SUN_CLOUDED, fx.grey);
    }
    if (sky.current) sky.current.intensity = 0.55 + 0.3 * fx.grey + 3 * fx.flash;
    const fog = state.scene.fog as THREE.Fog | null;
    if (fog) {
      fog.near = 30 - 24 * fx.fog;
      fog.far = 95 - 55 * fx.fog;
      fog.color.lerpColors(FOG_CLEAR, FOG_CLOUDED, fx.grey);
    }

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
    if (s.focus || s.wallOpen) {
      const { dist, from } = s.focus ? FOCUS[s.focus] : VISITOR_WALL.focus;
      tgt = v(s.focus ? ANCHORS[s.focus] : VISITOR_WALL.focus.anchor);
      pos = tgt.clone().add(v(from).normalize().multiplyScalar(tall ? dist * 1.35 : dist));
      if (!tall && (s.panelOpen || s.wallOpen)) {
        // Keep the part visible to the left of the side panel.
        const right = tgt.clone().sub(pos).normalize().cross(UP).normalize();
        tgt.add(right.multiplyScalar(dist * 0.22));
      }
      // Phones: the card or sheet covers the bottom, so show the part in the top half.
      if (tall && (s.panelOpen || s.wallOpen || s.touring)) tgt.y -= dist * 0.12;
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
      <hemisphereLight ref={sky} args={["#ffd8b0", "#6b7a4c", 0.55]} />
      <ambientLight intensity={0.12} />
      {/* The low sun, front left: long shadows, warm faces. Clouds dim it and cool it. */}
      <directionalLight
        ref={sun}
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
