import type { StressTest } from "./types";

/** "Try to break it": what each test is, and which part of the building explains why it held. */
export const stressTests: StressTest[] = [
  {
    id: "load",
    label: "Load",
    icon: "🏋️",
    running: "150 tonnes on the roof…",
    result: "Held. Columns, beams and footings carry the load all the way down to the ground.",
    hotspot: "structure",
  },
  {
    id: "quake",
    label: "Earthquake",
    icon: "🌍",
    running: "The ground is shaking…",
    result: "Held. Deep diaphragm walls and footings keep it anchored while the ground moves.",
    hotspot: "foundation",
  },
  {
    id: "wind",
    label: "Wind",
    icon: "🌪️",
    running: "A storm is pushing on the facade…",
    result: "Held. The frame takes the wind, and the roof's solar array is designed to stay down.",
    hotspot: "solar",
  },
  {
    id: "flood",
    label: "Flood",
    icon: "🌊",
    running: "The water is rising…",
    result: "Held. Water audits find where water gets in before it does any damage.",
    hotspot: "audit",
  },
];

export const stressTestById = (id: string | null) => stressTests.find((t) => t.id === id);
