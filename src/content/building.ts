import type { Hotspot } from "./types";

/**
 * What each part of the building opens. Order = the walk order (where it started,
 * then foundation to roof) and the order of the "In this building" list.
 */
export const hotspots: Hotspot[] = [
  {
    id: "hut",
    label: "Site office",
    hint: "Where it started",
    title: "Where it started",
    intro: "A Diploma in Architecture first, then straight into the second year of Civil Engineering. And before either was finished, a hard hat on a PWD site.",
    job: "pwd",
    lines: [
      "Diploma in Architecture · Govt. Women's Polytechnic, Jamshedpur (2017 – 2020)",
      "B.E. Civil Engineering · B.A College of Engineering and Technology (2020 – 2024), lateral entry on Diploma merit",
    ],
  },
  {
    id: "foundation",
    label: "Diaphragm walls",
    hint: "Deep foundations",
    title: "Holding back the earth",
    intro: "Reinforced concrete diaphragm walls for deep excavations and basements, designed against earth pressure and groundwater.",
    job: "amar",
    skills: ["Diaphragm walls", "Pile foundations", "Praxis", "WALLAP", "CADS"],
  },
  {
    id: "structure",
    label: "Columns & beams",
    hint: "Structural layouts",
    title: "Every column in its place",
    intro: "Column, tie beam, centreline and footing layouts, plus the furniture, electrical and plumbing plans that go with them.",
    job: "spd",
    skills: ["AutoCAD", "STAAD Pro", "Layout planning"],
  },
  {
    id: "audit",
    label: "NDT scanner",
    hint: "Structural audits",
    title: "Is it safe? I check.",
    intro: "Structural and water audits with Non-Destructive Testing: rebound hammer and ultrasonic pulse velocity tests that read a structure's health without breaking it.",
    job: "manupama",
    skills: ["NDT", "Rebound Hammer", "UPV", "Water audits", "Audit reports"],
  },
  {
    id: "green",
    label: "Green plaque",
    hint: "IGBC certification",
    title: "Built green, on paper and on site",
    intro: "Documentation and compliance work that takes project sites to IGBC (Indian Green Building Council) certification.",
    lines: [
      "Spearheaded documentation and compliance processes to achieve IGBC certification for project sites at Manupama Technologies.",
      "Green building compliance documentation.",
    ],
    skills: ["IGBC", "Green building compliance"],
  },
  {
    id: "vastu",
    label: "Compass",
    hint: "Vastu & interiors",
    title: "Space that feels right",
    intro: "The architect's side: Vastu Shastra consultation and interior design study, alongside furniture layouts for homes and offices.",
    lines: ["Vastu consultation and interior design study", "Furniture layout plans for residential and commercial permit packages"],
    skills: ["Vastu Shastra", "Interior design"],
  },
  {
    id: "solar",
    label: "Solar roof",
    hint: "Solar PV design",
    title: "Power on the roof",
    intro: "Rooftop and ground-mounted solar arrays, sized, drawn and documented down to the last connection.",
    job: "edw",
    skills: ["Solar PV", "AutoCAD", "SLD", "BOM", "Panel schedules"],
  },
];

export const hotspotById = (id: string | null) => hotspots.find((h) => h.id === id);
