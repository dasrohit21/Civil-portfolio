import type { Education, Job, SkillGroup } from "./types";

/** Everything here comes from Soni's CV. Edit this file to change what the site and the resume say. */
export const profile = {
  name: "Soni Kumari",
  initials: "S.K.",
  role: "Civil & Design Engineer",
  place: "Jamshedpur, India",
  headline: "I bridge the gap between architectural planning and engineering precision.",
  summary:
    "A structurally-grounded Civil and Design Engineer with a career spanning multi-disciplinary environments at SPD Engineering & Consultancy, Energy Design Works, and Amar Found. I specialise in structural layout design, solar PV systems engineering, and green building compliance. Currently at Manupama Technologies Pvt. Ltd., Jamshedpur, I conduct structural and water audits, perform Non-Destructive Testing (NDT), and support IGBC certification — ensuring that quality, safety, and sustainability standards are practically integrated into every project I undertake.",
  // The phone number on the CV is left off the site until Soni says it can be public.
  contact: [
    { label: "sonikumari2002238@gmail.com", short: "Email", href: "mailto:sonikumari2002238@gmail.com" },
    { label: "linkedin.com/in/soni-kumari-878031391", short: "LinkedIn", href: "https://www.linkedin.com/in/soni-kumari-878031391" },
  ],
  resumePdf: "/soni-kumari-resume.pdf",
};

export const experience: Job[] = [
  {
    id: "manupama",
    org: "Manupama Technologies Pvt. Ltd.",
    place: "Jamshedpur, India",
    role: "Asst. Structure Engineer",
    period: "December 2024 – Present",
    points: [
      "Conducted Structural and Water Audits alongside Non-Destructive Testing (NDT), authoring detailed technical compliance and engineering integrity reports for industrial sites.",
      "Sustainability & Certification: spearheaded documentation and compliance processes to achieve IGBC (Indian Green Building Council) Certification for project sites.",
      "Engineering Design: developed precise 2D drafting and 3D modelling designs to support facility modifications, audit recommendations, and spatial planning.",
    ],
  },
  {
    id: "amar",
    org: "Amar Found",
    place: "Surat, Gujarat",
    role: "Civil Engineer",
    period: "April 2024 – December 2024",
    points: [
      "Designed reinforced concrete diaphragm walls for deep excavation retention, basement construction, and cut-and-cover applications.",
      "Produced diaphragm wall panel layout drawings including panel sequencing, guide wall details, and reinforcement cage schedules.",
      "Coordinated diaphragm wall toe levels with geotechnical investigation data and analysed lateral earth pressure, hydrostatic loads, and surcharge effects using Praxis / WALLAP / CADS.",
    ],
  },
  {
    id: "edw",
    org: "Energy Design Works",
    place: "Jamshedpur",
    role: "CAD Engineer",
    period: "February 2023 – April 2024",
    points: [
      "Designed preliminary layouts and final permit packages based on the client's needs and building property specifications.",
      "Led project calculations, component sizing and BOM preparation for solar PV systems.",
      "Designed roof-top and ground-mounted solar arrays in AutoCAD, with accurate system sizing calculations.",
      "Created Electrical Single-Line Diagrams, panel schedules and connection diagrams for solar electric systems.",
      "Worked across functions with project management and installation teams to meet clients' needs and internal deadlines.",
    ],
  },
  {
    id: "spd",
    org: "SPD Engineering & Consultancy",
    place: "Jamshedpur",
    role: "Junior Engineer",
    period: "April 2022 – December 2022",
    points: [
      "Plan with furniture layout",
      "Column layout plan",
      "Tie beam layout plan",
      "Centreline plan",
      "Footing layout plan",
      "Electrical layout plan",
      "Plumbing layout plan",
    ],
  },
];

export const internship: Job = {
  id: "pwd",
  org: "Public Works Department, Building Division",
  place: "Dhanbad",
  role: "Junior Engineer (Intern)",
  period: "September 2019 – November 2019",
  points: [
    "Regular construction site visits to observe on-ground civil engineering processes and project execution workflows.",
    "Practical knowledge of building materials — their properties, specifications, grades, and application in structural and finishing works.",
    "Daily site inspections to monitor the quality of incoming materials and ongoing construction, ensuring adherence to prescribed standards.",
  ],
};

export const education: Education[] = [
  {
    degree: "Bachelor of Engineering in Civil Engineering",
    school: "B.A College of Engineering and Technology (JUT)",
    note: "Lateral entry: admitted directly to 2nd year in 2021 on Diploma merit",
    score: "7.40 CGPA",
    period: "2020 – 2024",
  },
  {
    degree: "Diploma in Architecture",
    school: "Govt. Women's Polytechnic, Jamshedpur (JUT)",
    score: "6.69 CGPA",
    period: "2017 – 2020",
  },
];

export const skills: SkillGroup[] = [
  { name: "Software", items: "AutoCAD (Proficient), STAAD Pro, MS Office Suite (Word, Excel, PowerPoint)" },
  { name: "Structural & Civil Design", items: "AutoCAD drafting, structural layout planning (column, tie beam, centreline, footing), foundation design (pile & diaphragm), anchor report preparation, site inspection & verification" },
  { name: "Architectural Drawing", items: "Furniture, electrical and plumbing layout plans for residential and commercial permit packages" },
  { name: "Vastu Shastra & Interior Design", items: "Vastu consultation and interior design study" },
  { name: "Solar PV Engineering", items: "Rooftop and ground-mounted array design, system sizing, BOM, Single-Line Diagrams, panel schedules and connection diagrams" },
  { name: "Audit & Quality", items: "Structural audits, water audits, Non-Destructive Testing (NDT), audit report preparation" },
  { name: "Sustainability & Certification", items: "IGBC certification support, green building compliance documentation" },
];

export const project = {
  title: "Structural Stability & Safety Assessment of Industrial/Commercial Structures",
  points: [
    "Comprehensive structural health monitoring, structural auditing, and safety compliance reporting for industrial building sites.",
    "Non-Destructive Testing (NDT) including Rebound Hammer and Ultrasonic Pulse Velocity (UPV) tests to evaluate concrete compressive strength and integrity.",
    "Detailed Water Audits and moisture ingress analysis to prevent structural degradation.",
    "Technical audit reports outlining structural deficiencies, load-bearing capacities, and retrofitting recommendations to meet industrial safety standards.",
  ],
};

export const jobById = (id: string | undefined) => (id ? [...experience, internship].find((j) => j.id === id) : undefined);
