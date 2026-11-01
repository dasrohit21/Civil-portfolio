"use client";

import { Canvas } from "@react-three/fiber";
import { useStore } from "@/lib/store";
import { SketchLines } from "@/components/sketch/SketchLines";
import { Building } from "./Building";
import { Hotspots } from "./Hotspots";
import { CAMERA } from "./model";
import { Rig } from "./Rig";

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
      camera={{ position: CAMERA.sketch.position, fov: CAMERA.fov, near: 0.1, far: 100 }}
      onPointerMissed={tapEmpty}
      aria-hidden="true"
    >
      <Rig />
      <SketchLines />
      <Building />
      <Hotspots />
    </Canvas>
  );
}
