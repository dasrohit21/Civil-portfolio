"use client";

import { Environment } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useStore } from "@/lib/store";
import { SketchLines } from "@/components/sketch/SketchLines";
import { Building } from "./Building";
import { Hotspots } from "./Hotspots";
import { Rain } from "./Rain";
import { CAMERA } from "./model";
import { Rig } from "./Rig";
import { daylight } from "./daylight";
import { Sky } from "./Sky";
import { StressEffects } from "./StressTest";
import { VisitorWall } from "./VisitorWall";

/** A tap on empty space: finish the drawing, or close whatever is open. */
function tapEmpty() {
  const s = useStore.getState();
  if (s.phase === "sketch") s.finishSketch();
  else if (s.panelOpen) s.close();
  else if (s.wallOpen) s.closeWall();
  else if (s.touring) s.stopTour();
}

export default function Scene() {
  const lowPower = useStore((s) => s.lowPower);
  const skyKey = useStore((s) => s.skyKey);
  return (
    <Canvas
      shadows={!lowPower}
      dpr={lowPower ? [1, 1.25] : [1, 2]}
      camera={{ position: CAMERA.sketch.position, fov: CAMERA.fov, near: 0.1, far: 300 }}
      onPointerMissed={tapEmpty}
      aria-hidden="true"
    >
      {/* Distant things fade into the haze at the horizon (the Rig colours it with the sky) */}
      <fog attach="fog" args={[daylight.palette.horizon.clone(), 30, 95]} />
      {/* Reflections for the glass and the panels, drawn from the sky (no download), and drawn
          again when the time of day or the clouds have changed it */}
      <Environment key={skyKey} frames={1} resolution={256} environmentIntensity={0.6}>
        <Sky />
      </Environment>
      <Sky follow />
      <Rig />
      <SketchLines />
      <Building />
      <StressEffects />
      <Rain />
      <VisitorWall />
      <Hotspots />
    </Canvas>
  );
}
