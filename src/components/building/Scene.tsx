"use client";

import { Environment } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useStore } from "@/lib/store";
import { SketchLines } from "@/components/sketch/SketchLines";
import { Building } from "./Building";
import { Hotspots } from "./Hotspots";
import { CAMERA } from "./model";
import { Rig } from "./Rig";
import { SUNSET, Sky } from "./Sky";

/** A tap on empty space: finish the drawing, or close whatever is open. */
function tapEmpty() {
  const s = useStore.getState();
  if (s.phase === "sketch") s.finishSketch();
  else if (s.panelOpen) s.close();
  else if (s.touring) s.stopTour();
}

export default function Scene() {
  const lowPower = useStore((s) => s.lowPower);
  return (
    <Canvas
      shadows={!lowPower}
      dpr={lowPower ? [1, 1.25] : [1, 2]}
      camera={{ position: CAMERA.sketch.position, fov: CAMERA.fov, near: 0.1, far: 300 }}
      onPointerMissed={tapEmpty}
      aria-hidden="true"
    >
      {/* Distant things fade into the sunset haze */}
      <fog attach="fog" args={[SUNSET.horizon, 30, 95]} />
      {/* Reflections for the glass and the panels, made once from the sunset sky (no download) */}
      <Environment frames={1} resolution={256} environmentIntensity={0.6}>
        <Sky />
      </Environment>
      <Sky follow />
      <Rig />
      <SketchLines />
      <Building />
      <Hotspots />
    </Canvas>
  );
}
