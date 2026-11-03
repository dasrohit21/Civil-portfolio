"use client";

import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import * as THREE from "three";
import type { WeatherKind } from "@/content/types";
import { clocks, fx, useStore } from "@/lib/store";
import { previewPeriod } from "@/lib/sky";
import { daylight, updateDaylight } from "./daylight";
import { ANCHORS, CAMERA, FOCUS, SCALE_VIEWS, SKETCH_SECONDS, T, VISITOR_WALL } from "./model";
import { TEST_SECONDS, envelope } from "./StressTest";

const UP = new THREE.Vector3(0, 1, 0);
const SUN_CLOUDED = new THREE.Color("#d9dde4");
/** How bright the reflections are by day; at night they dim with the sky. */
const ENV_INTENSITY = 0.6;

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

/** Ease the scene towards the visitor's weather, and throw the odd bolt of lightning in a storm. */
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
  const fill = useRef<THREE.DirectionalLight>(null);
  const [preview] = useState(previewPeriod);

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

    // Weather, and the time of day: only once the building has risen out of the paper.
    updateWeather(clocks.build > 1 ? (s.live?.kind ?? "clear") : "clear", dt);
    updateDaylight(dt, s.live, THREE.MathUtils.smoothstep(clocks.build, 0, 1.8), s.reducedMotion, preview);
    const p = daylight.palette;
    const day = 1 - daylight.night;
    if (sun.current) {
      sun.current.position.copy(daylight.lightDir).multiplyScalar(18);
      sun.current.intensity = daylight.lightI * (1 - 0.72 * fx.grey);
      sun.current.color.copy(p.light).lerp(SUN_CLOUDED, fx.grey * day);
    }
    if (sky.current) {
      sky.current.color.copy(p.hemi);
      sky.current.groundColor.copy(p.ground);
      sky.current.intensity = daylight.hemiI + 0.3 * fx.grey * day + 3 * fx.flash;
    }
    if (fill.current) {
      fill.current.color.copy(p.fill);
      fill.current.intensity = daylight.fillI;
    }
    state.scene.environmentIntensity = ENV_INTENSITY * (0.2 + 0.8 * day);
    // Redraw the reflections when the sky has changed enough to see.
    const skyKey = `${Math.round(daylight.elevation / 3)}:${Math.round(daylight.cover * 4)}`;
    if (skyKey !== s.skyKey) s.setSkyKey(skyKey);
    if (daylight.night > 0.5 !== s.dark) s.setDark(daylight.night > 0.5);
    // Fog is measured from what the camera looks at, so phones (whose camera stands further back)
    // get the same haze as wide screens instead of losing the building in it.
    const fog = state.scene.fog as THREE.Fog | null;
    if (fog) {
      const d = camera.position.distanceTo(look.current);
      fog.near = THREE.MathUtils.lerp(d + 8, d * 0.6, fx.fog);
      fog.far = THREE.MathUtils.lerp(d + 70, d + 18, fx.fog);
      fog.color.lerpColors(p.horizon, p.cloudedHorizon, fx.grey);
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
    if (s.scale !== "site" && s.phase === "built" && !s.focus && !s.wallOpen) {
      const view = SCALE_VIEWS[s.scale];
      tgt = v(view.target);
      pos = tgt.clone().add(v(view.offset).multiplyScalar(tall ? 1.5 : 1));
    } else if (s.focus || s.wallOpen) {
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

    const speed = s.reducedMotion ? 60 : s.focus ? 2.4 : s.scale !== "site" ? 1.2 : 1.6;
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
      {/* The sky above, green bounce from the lawn below; both follow the time of day */}
      <hemisphereLight ref={sky} args={["#ffd8b0", "#6b7a4c", 0.55]} />
      <ambientLight intensity={0.12} />
      {/* The sun from the front, right in the morning and left at dusk, or the moon at night.
          Clouds dim it and cool it. */}
      <directionalLight
        ref={sun}
        position={daylight.lightDir.clone().multiplyScalar(18)}
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
      {/* Cool light from the open sky on the shaded side */}
      <directionalLight ref={fill} position={[12, 7, -6]} intensity={0.6} color="#9db4ff" />
    </>
  );
}
