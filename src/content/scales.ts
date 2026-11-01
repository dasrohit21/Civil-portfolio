import type { ScaleLevel } from "./types";

/** The scale bar: from the whole city down to the steel inside the concrete. */
export const scales: ScaleLevel[] = [
  {
    id: "city",
    ratio: "1:5000",
    label: "City",
    caption: "Jamshedpur, the Steel City, where Soni works.",
  },
  {
    id: "site",
    ratio: "1:500",
    label: "Site",
    caption: "The site: the building, its foundations and everything round it.",
  },
  {
    id: "detail",
    ratio: "1:20",
    label: "Steel",
    caption: "Inside the concrete: the reinforcement that carries the load. Cages, bars and footings are what she draws and schedules.",
  },
];
