"use client";

import { create } from "zustand";
import { hotspots } from "@/content/building";
import type { HotspotId } from "@/content/types";

/**
 * sketch:   the pencil draws the building on paper
 * building: "Build it" was pressed; the sketch rises into the model
 * built:    the finished building, ready to explore
 * printing: "Print drawings" was pressed; the model folds back to paper
 * printed:  it's paper again; time to open /resume
 */
export type Phase = "sketch" | "building" | "built" | "printing" | "printed";

/**
 * Seconds into the sketch and the build. Changed every frame by the Rig, so they live
 * outside React state; components read them inside useFrame.
 */
export const clocks = { sketch: 0, build: 0 };

type State = {
  phase: Phase;
  sketchDone: boolean;
  focus: HotspotId | null;
  panelOpen: boolean;
  touring: boolean;
  tourIndex: number;
  hovered: HotspotId | null;
  reducedMotion: boolean;
  lowPower: boolean;
  /** When the build finished, to show the "structurally sound" stamp once. */
  stampAt: number;

  setEnv: (env: { reducedMotion: boolean; lowPower: boolean }) => void;
  finishSketch: () => void;
  build: () => void;
  finishBuild: () => void;
  print: () => void;
  finishPrint: () => void;
  /** Back from /resume: show the finished building again. */
  rebuilt: () => void;
  open: (id: HotspotId) => void;
  close: () => void;
  hover: (id: HotspotId | null) => void;
  startTour: () => void;
  stepTour: (dir: 1 | -1) => void;
  stopTour: () => void;
};

export const useStore = create<State>((set, get) => ({
  phase: "sketch",
  sketchDone: false,
  focus: null,
  panelOpen: false,
  touring: false,
  tourIndex: 0,
  hovered: null,
  reducedMotion: false,
  lowPower: false,
  stampAt: 0,

  setEnv: (env) => set(env),
  finishSketch: () => set({ sketchDone: true }),
  build: () => {
    if (get().phase !== "sketch") return;
    set({ phase: "building", sketchDone: true });
  },
  finishBuild: () => set({ phase: "built", stampAt: Date.now() }),
  print: () => set({ phase: "printing", focus: null, panelOpen: false, touring: false, hovered: null }),
  finishPrint: () => set({ phase: "printed" }),
  rebuilt: () => set({ phase: "built", sketchDone: true }),
  open: (id) => set({ focus: id, panelOpen: true, touring: false }),
  close: () => set({ focus: null, panelOpen: false }),
  hover: (hovered) => set({ hovered }),
  startTour: () => set({ touring: true, tourIndex: 0, panelOpen: false, focus: hotspots[0].id }),
  stepTour: (dir) => {
    const next = get().tourIndex + dir;
    if (next < 0 || next >= hotspots.length) return set({ touring: false, focus: null, tourIndex: 0 });
    set({ tourIndex: next, focus: hotspots[next].id });
  },
  stopTour: () => set({ touring: false, focus: null }),
}));
