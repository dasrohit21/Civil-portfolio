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

/** The drawing scales the scale bar moves between. */
export type ScaleId = "city" | "site" | "detail";

export type ScaleLevel = { id: ScaleId; ratio: string; label: string; caption: string };

/** The kinds of weather the scene can show. */
export type WeatherKind = "clear" | "cloudy" | "overcast" | "fog" | "rain" | "storm" | "snow";

/** Right now where the visitor is (or in Jamshedpur), from /api/sky. */
export type Live = {
  place: { name: string; country: string; lat: number; lon: number; tz: string };
  /** near: from the visitor's network; exact: they shared their location; home: Soni's Jamshedpur. */
  source: "near" | "exact" | "home";
  tempC: number;
  /** In words, as the weather service puts it ("Patchy rain nearby"). */
  weather: string;
  kind: WeatherKind;
  /** How hard it's raining or snowing, 0..1. */
  intensity: number;
  isDay: boolean;
  /** What the model's rooftop array would be producing now, from the real solar radiation. */
  solarKw: number;
  solarPeakKw: number;
  sunrise: string;
  sunset: string;
  /** Tonight's moon: its age through the month, 0 new .. 0.5 full .. 1 (null if unknown). */
  moon: number | null;
  /** Cloud cover, 0..100 %. */
  cloud: number;
  windKph: number;
};

/** One brick in the visitors' wall. */
export type Brick = { id: string; name: string; note: string; at: number };

/** A site photo or drawing from the studio, shown in its chapter. `url` is short-lived. */
export type Photo = { id: string; part: HotspotId; caption: string; url: string };

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
