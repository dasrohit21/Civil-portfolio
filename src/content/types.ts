export type Job = {
  id: string;
  org: string;
  place: string;
  role: string;
  period: string;
  points: string[];
};

export type SkillGroup = { name: string; items: string };

export type Education = { degree: string; school: string; note?: string; score: string; period: string };

export type HotspotId = "hut" | "foundation" | "structure" | "audit" | "green" | "vastu" | "solar";

export type StressTestId = "load" | "quake" | "wind" | "flood";

/** One of the "Try to break it" tests. */
export type StressTest = {
  id: StressTestId;
  label: string;
  icon: string;
  /** Shown while the test runs. */
  running: string;
  /** Shown once the building has held. */
  result: string;
  /** The part of the building that explains why it held. */
  hotspot: HotspotId;
};

/** One part of the building you can open. */
export type Hotspot = {
  id: HotspotId;
  /** The thing in the model, e.g. "Diaphragm walls". */
  label: string;
  /** Short line for the hover tag and the walk card. */
  hint: string;
  title: string;
  intro: string;
  /** The job this part tells about (an id from `experience`). */
  job?: string;
  /** Plain lines, for parts that aren't one job. */
  lines?: string[];
  skills?: string[];
};
