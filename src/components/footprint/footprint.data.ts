export type FootprintLocationId =
  | "egypt"
  | "vietnam"
  | "indonesia"
  | "thailand"
  | "malaysia"
  | "singapore"
  | "philippines"
  | "myanmar"
  | "saudi-arabia"
  | "jordan"
  | "sri-lanka";

export type FootprintLocation = {
  id: FootprintLocationId;
  name: string;
  lat: number;
  lng: number;
  accent: string;
  description: string;
  detail: string;
};

export type FootprintConnection = {
  from: FootprintLocationId;
  to: FootprintLocationId;
  color?: string;
};

export type FootprintPhoto = {
  id: string;
  src: string;
  alt: string;
  caption?: string;
};

export type FootprintRegion = {
  id: string;
  name: string;
  description: string;
  photos: FootprintPhoto[];
};

export type FootprintStory = {
  locationId: FootprintLocationId;
  heading: string;
  summary: string;
  regions: FootprintRegion[];
};

const FOOTPRINT_PLACEHOLDER_IMAGE = "/assets/footprint/earth-day.png";

const createPlaceholderPhotos = (
  country: string,
  region: string,
  count = 4
): FootprintPhoto[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `${country}-${region}-${index + 1}`,
    src: FOOTPRINT_PLACEHOLDER_IMAGE,
    alt: `${country} ${region} placeholder ${index + 1}`,
    caption: `${region} · Snapshot ${index + 1}`,
  }));

export const footprintLocations: FootprintLocation[] = [
  {
    id: "egypt",
    name: "Egypt",
    lat: 30.0444,
    lng: 31.2357,
    accent: "#ffd166",
    description:
      "A warm gold marker resting over North Africa, where desert tones meet the Nile on the real-world map.",
    detail:
      "Egypt anchors the western side of this route, with a brighter pulse and a lighter cinematic glow that keeps the globe vivid instead of heavy.",
  },
  {
    id: "vietnam",
    name: "Vietnam",
    lat: 16.0544,
    lng: 108.2022,
    accent: "#7dd3fc",
    description:
      "A bright cyan waypoint on the eastern arc of the map, linking the mainland coastline to the rest of the journey.",
    detail:
      "Vietnam brings a cooler color note to the scene, helping the travel line feel clean, airy, and a little anime-leaning without losing the real geography.",
  },
  {
    id: "indonesia",
    name: "Indonesia",
    lat: -8.4095,
    lng: 115.1889,
    accent: "#c4b5fd",
    description:
      "A violet marker spread across the island belt of Southeast Asia, softened by orbit light and moving arcs.",
    detail:
      "Indonesia closes the route with a softer lavender highlight, while the larger hotspot keeps the interaction readable across the wider island chain.",
  },
  {
    id: "thailand",
    name: "Thailand",
    lat: 13.7563,
    lng: 100.5018,
    accent: "#f59e0b",
    description:
      "A warm amber point in mainland Southeast Asia, bridging the inland routes with the maritime side of the map.",
    detail:
      "Thailand adds a compact central waypoint, useful for making the Southeast Asia cluster feel denser and more connected.",
  },
  {
    id: "malaysia",
    name: "Malaysia",
    lat: 3.139,
    lng: 101.6869,
    accent: "#34d399",
    description:
      "A green waypoint stretching across the Malay Peninsula and Borneo edge, tucked into the tropical route network.",
    detail:
      "Malaysia helps extend the footprint southward with a softer emerald accent that sits well beside cyan and violet markers.",
  },
  {
    id: "singapore",
    name: "Singapore",
    lat: 1.3521,
    lng: 103.8198,
    accent: "#22d3ee",
    description:
      "A compact aqua point at the southern tip of the peninsula, small in geography but bright in the composition.",
    detail:
      "Singapore gives the cluster a tight, urban waypoint that reads clearly even with nearby countries sharing similar longitudes.",
  },
  {
    id: "philippines",
    name: "Philippines",
    lat: 14.5995,
    lng: 120.9842,
    accent: "#60a5fa",
    description:
      "A cool blue marker over the western Pacific island chain, pushing the footprint outward into the ocean-facing side of Asia.",
    detail:
      "The Philippines widens the eastern spread of the globe composition and gives the route set a cleaner outward reach.",
  },
  {
    id: "myanmar",
    name: "Myanmar",
    lat: 16.8409,
    lng: 96.1735,
    accent: "#f97316",
    description:
      "A deep orange point on the western side of mainland Southeast Asia, adding a warmer inland balance to the cluster.",
    detail:
      "Myanmar helps transition the footprint visually from South Asia toward the brighter coastal countries farther east.",
  },
  {
    id: "saudi-arabia",
    name: "Saudi Arabia",
    lat: 24.7136,
    lng: 46.6753,
    accent: "#fb7185",
    description:
      "A rose-toned waypoint over the Arabian Peninsula, extending the footprint deeper into West Asia.",
    detail:
      "Saudi Arabia broadens the west-to-east sweep and gives the globe another strong stop between North Africa and South Asia.",
  },
  {
    id: "jordan",
    name: "Jordan",
    lat: 31.9539,
    lng: 35.9106,
    accent: "#fca5a5",
    description:
      "A soft coral point in the Levant, sitting near the hinge between North Africa, the Arabian Peninsula, and western Asia.",
    detail:
      "Jordan creates a compact mid-route waypoint that visually softens the jump from Egypt toward the Gulf region.",
  },
  {
    id: "sri-lanka",
    name: "Sri Lanka",
    lat: 6.9271,
    lng: 79.8612,
    accent: "#a78bfa",
    description:
      "A lilac marker just south of India, adding a small but distinct island stop in the Indian Ocean corridor.",
    detail:
      "Sri Lanka helps the map feel more layered across the Indian Ocean, without overcrowding the densest Southeast Asia cluster.",
  },
];

export const footprintConnections: FootprintConnection[] = [
  { from: "egypt", to: "jordan", color: "#ffd166" },
  { from: "egypt", to: "saudi-arabia", color: "#f7a8a8" },
  { from: "jordan", to: "saudi-arabia", color: "#fb7185" },
  { from: "jordan", to: "sri-lanka", color: "#84d8ff" },
  { from: "saudi-arabia", to: "sri-lanka", color: "#c084fc" },
  { from: "sri-lanka", to: "thailand", color: "#8b5cf6" },
  { from: "myanmar", to: "thailand", color: "#f59e0b" },
  { from: "myanmar", to: "vietnam", color: "#f97316" },
  { from: "thailand", to: "vietnam", color: "#7dd3fc" },
  { from: "thailand", to: "malaysia", color: "#fbbf24" },
  { from: "malaysia", to: "singapore", color: "#2dd4bf" },
  { from: "malaysia", to: "indonesia", color: "#34d399" },
  { from: "singapore", to: "philippines", color: "#38bdf8" },
  { from: "vietnam", to: "philippines", color: "#60a5fa" },
  { from: "philippines", to: "indonesia", color: "#93c5fd" },
];

export const footprintStories: Record<FootprintLocationId, FootprintStory> = {
  egypt: {
    locationId: "egypt",
    heading: "Egypt travel snapshots",
    summary:
      "Desert warmth, ancient landmarks, and a slower river rhythm shaped the visual memory here.",
    regions: [
      {
        id: "cairo",
        name: "Cairo",
        description: "Dense city textures, museum stops, and evening street energy.",
        photos: createPlaceholderPhotos("egypt", "cairo"),
      },
      {
        id: "giza",
        name: "Giza",
        description: "Open desert light, monument silhouettes, and wide horizon frames.",
        photos: createPlaceholderPhotos("egypt", "giza"),
      },
      {
        id: "luxor",
        name: "Luxor",
        description: "Temple corridors, river edges, and layered historic details.",
        photos: createPlaceholderPhotos("egypt", "luxor"),
      },
    ],
  },
  vietnam: {
    locationId: "vietnam",
    heading: "Vietnam travel snapshots",
    summary:
      "City motion, coastal light, and lantern-filled nights make Vietnam the most layered stop in the set.",
    regions: [
      {
        id: "ho-chi-minh",
        name: "Ho Chi Minh",
        description: "Fast streets, cafe corners, and neon evening density.",
        photos: createPlaceholderPhotos("vietnam", "ho-chi-minh"),
      },
      {
        id: "da-nang",
        name: "Da Nang",
        description: "Beachline air, bridges, and cleaner open-frame city views.",
        photos: createPlaceholderPhotos("vietnam", "da-nang"),
      },
      {
        id: "hoi-an",
        name: "Hoi An",
        description: "Warm lantern glow, old-town facades, and slower riverside moments.",
        photos: createPlaceholderPhotos("vietnam", "hoi-an"),
      },
    ],
  },
  indonesia: {
    locationId: "indonesia",
    heading: "Indonesia travel snapshots",
    summary:
      "Island-to-island movement, humid nights, and layered coastal scenes define this route.",
    regions: [
      {
        id: "bali",
        name: "Bali",
        description: "Temple silhouettes, surf light, and tropical greens.",
        photos: createPlaceholderPhotos("indonesia", "bali"),
      },
      {
        id: "jakarta",
        name: "Jakarta",
        description: "Urban compression, skyline pockets, and busy local rhythm.",
        photos: createPlaceholderPhotos("indonesia", "jakarta"),
      },
      {
        id: "yogyakarta",
        name: "Yogyakarta",
        description: "Historic textures, crafts, and softer inland color.",
        photos: createPlaceholderPhotos("indonesia", "yogyakarta"),
      },
    ],
  },
  thailand: {
    locationId: "thailand",
    heading: "Thailand travel snapshots",
    summary:
      "A mix of temple detail, street food energy, and tropical coastlines.",
    regions: [
      {
        id: "bangkok",
        name: "Bangkok",
        description: "Neon streets, river movement, and layered city contrast.",
        photos: createPlaceholderPhotos("thailand", "bangkok"),
      },
      {
        id: "chiang-mai",
        name: "Chiang Mai",
        description: "Mountain air, markets, and calmer old-town pacing.",
        photos: createPlaceholderPhotos("thailand", "chiang-mai"),
      },
      {
        id: "phuket",
        name: "Phuket",
        description: "Sea light, boats, and bright tropical color blocks.",
        photos: createPlaceholderPhotos("thailand", "phuket"),
      },
    ],
  },
  malaysia: {
    locationId: "malaysia",
    heading: "Malaysia travel snapshots",
    summary:
      "Dense tropical weather, modern skyline moments, and food-first city memory.",
    regions: [
      {
        id: "kuala-lumpur",
        name: "Kuala Lumpur",
        description: "Night skyline, transit rhythm, and dense urban polish.",
        photos: createPlaceholderPhotos("malaysia", "kuala-lumpur"),
      },
      {
        id: "penang",
        name: "Penang",
        description: "Street murals, heritage blocks, and layered food scenes.",
        photos: createPlaceholderPhotos("malaysia", "penang"),
      },
      {
        id: "langkawi",
        name: "Langkawi",
        description: "Island coastlines, open skies, and slower resort light.",
        photos: createPlaceholderPhotos("malaysia", "langkawi"),
      },
    ],
  },
  singapore: {
    locationId: "singapore",
    heading: "Singapore travel snapshots",
    summary:
      "Compact, polished, and highly visual — urban density with very clean composition.",
    regions: [
      {
        id: "marina-bay",
        name: "Marina Bay",
        description: "Waterfront skyline reflections and night architecture.",
        photos: createPlaceholderPhotos("singapore", "marina-bay"),
      },
      {
        id: "chinatown",
        name: "Chinatown",
        description: "Street texture, color layering, and denser pedestrian scenes.",
        photos: createPlaceholderPhotos("singapore", "chinatown"),
      },
      {
        id: "sentosa",
        name: "Sentosa",
        description: "Coastal leisure stops and brighter daytime frames.",
        photos: createPlaceholderPhotos("singapore", "sentosa"),
      },
    ],
  },
  philippines: {
    locationId: "philippines",
    heading: "Philippines travel snapshots",
    summary:
      "Island hopping energy, bright water, and open-sky compositions dominate the feel here.",
    regions: [
      {
        id: "manila",
        name: "Manila",
        description: "Fast city scenes, traffic layers, and dense neighborhood color.",
        photos: createPlaceholderPhotos("philippines", "manila"),
      },
      {
        id: "cebu",
        name: "Cebu",
        description: "Port-city motion with a coastal edge.",
        photos: createPlaceholderPhotos("philippines", "cebu"),
      },
      {
        id: "palawan",
        name: "Palawan",
        description: "Clear water, cliffs, and postcard-like open space.",
        photos: createPlaceholderPhotos("philippines", "palawan"),
      },
    ],
  },
  myanmar: {
    locationId: "myanmar",
    heading: "Myanmar travel snapshots",
    summary:
      "Warm inland tones, temple silhouettes, and quieter road scenes shape this stop.",
    regions: [
      {
        id: "yangon",
        name: "Yangon",
        description: "Golden light, city bustle, and colonial-era street texture.",
        photos: createPlaceholderPhotos("myanmar", "yangon"),
      },
      {
        id: "bagan",
        name: "Bagan",
        description: "Temple fields, sunrise haze, and wide open plains.",
        photos: createPlaceholderPhotos("myanmar", "bagan"),
      },
      {
        id: "mandalay",
        name: "Mandalay",
        description: "Bridge lines, river air, and historic urban rhythm.",
        photos: createPlaceholderPhotos("myanmar", "mandalay"),
      },
    ],
  },
  "saudi-arabia": {
    locationId: "saudi-arabia",
    heading: "Saudi Arabia travel snapshots",
    summary:
      "Desert scale, modern city light, and strong architectural contrast stand out here.",
    regions: [
      {
        id: "riyadh",
        name: "Riyadh",
        description: "Contemporary skyline views and wide urban geometry.",
        photos: createPlaceholderPhotos("saudi-arabia", "riyadh"),
      },
      {
        id: "jeddah",
        name: "Jeddah",
        description: "Red Sea air, waterfront scenes, and old-city texture.",
        photos: createPlaceholderPhotos("saudi-arabia", "jeddah"),
      },
      {
        id: "alula",
        name: "AlUla",
        description: "Rock formations, desert depth, and cinematic open space.",
        photos: createPlaceholderPhotos("saudi-arabia", "alula"),
      },
    ],
  },
  jordan: {
    locationId: "jordan",
    heading: "Jordan travel snapshots",
    summary:
      "Sandstone color, dry air, and compact historic routes make this stop feel cinematic.",
    regions: [
      {
        id: "amman",
        name: "Amman",
        description: "Layered hills, stone buildings, and golden-hour city views.",
        photos: createPlaceholderPhotos("jordan", "amman"),
      },
      {
        id: "petra",
        name: "Petra",
        description: "Rose-colored rock corridors and carved monumental detail.",
        photos: createPlaceholderPhotos("jordan", "petra"),
      },
      {
        id: "wadi-rum",
        name: "Wadi Rum",
        description: "Open desert frames and dramatic geological texture.",
        photos: createPlaceholderPhotos("jordan", "wadi-rum"),
      },
    ],
  },
  "sri-lanka": {
    locationId: "sri-lanka",
    heading: "Sri Lanka travel snapshots",
    summary:
      "Train windows, tea-country greens, and warmer coastal stops define the memory here.",
    regions: [
      {
        id: "colombo",
        name: "Colombo",
        description: "Oceanfront city motion and humid urban detail.",
        photos: createPlaceholderPhotos("sri-lanka", "colombo"),
      },
      {
        id: "kandy",
        name: "Kandy",
        description: "Hill-country atmosphere, temples, and slower pacing.",
        photos: createPlaceholderPhotos("sri-lanka", "kandy"),
      },
      {
        id: "galle",
        name: "Galle",
        description: "Fort walls, coastal light, and colonial-era textures.",
        photos: createPlaceholderPhotos("sri-lanka", "galle"),
      },
    ],
  },
};

export const defaultFootprintLocation = footprintLocations[0];
