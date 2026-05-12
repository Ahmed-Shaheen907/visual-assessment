export interface Landmark {
  id: string;
  label: string;
  lat: number;
  lng: number;
}

export interface Section {
  id: string;
  label: string;
  center: [number, number];
  bounds: [[number, number], [number, number]];
  polygonCoords?: [number, number][];
  landmarks: Landmark[];
  improvementTip: string;
}

export const SECTIONS: Section[] = [
  {
    id: 'marsa_matrouh',
    label: 'Marsa Matrouh',
    center: [31.3543, 27.2373],
    bounds: [[31.27, 26.85], [31.40, 27.32]],
    polygonCoords: [
      [31.48, 26.8], [31.47, 27.0], [31.44, 27.2], [31.41, 27.4], [31.38, 27.6],
      [31.22, 27.6], [31.25, 27.4], [31.28, 27.2], [31.30, 27.0], [31.30, 26.8],
    ],
    improvementTip: 'Focus on studying the coastal landmarks and key selling points of Marsa Matrouh — its beaches, marina, and proximity to Siwa.',
    landmarks: [
      { id: 'mm-1', label: 'Cleopatra Beach',     lat: 31.37, lng: 27.21 },
      { id: 'mm-2', label: 'Agiba Beach',          lat: 31.30, lng: 26.92 },
      { id: 'mm-3', label: 'Rommel Beach',         lat: 31.36, lng: 27.18 },
      { id: 'mm-4', label: 'Marsa Matrouh Marina', lat: 31.35, lng: 27.23 },
      { id: 'mm-5', label: 'Lido Beach',           lat: 31.37, lng: 27.24 },
    ],
  },
  {
    id: 'sidi_heneish',
    label: 'Sidi Heneish',
    center: [31.179, 27.625],
    bounds: [[31.14, 27.52], [31.21, 27.72]],
    polygonCoords: [],
    improvementTip: 'Review the unique features and real estate projects in Sidi Heneish, including beach access and community amenities.',
    landmarks: [
      { id: 'sh-1', label: 'Almaza Bay',                    lat: 31.195, lng: 27.555 },
      { id: 'sh-2', label: 'Baghoush Village',              lat: 31.172, lng: 27.669 },
      { id: 'sh-3', label: 'El Abd Resort',                 lat: 31.185, lng: 27.635 },
      { id: 'sh-4', label: 'Makanna Clubhouse',             lat: 31.183, lng: 27.638 },
      { id: 'sh-5', label: 'Sidi Heneish Train Station',    lat: 31.163, lng: 27.627 },
    ],
  },
  {
    id: 'ras_al_hekma',
    label: 'Ras Al Hekma',
    center: [31.1150, 28.6330],
    bounds: [[30.96, 28.47], [31.14, 28.73]],
    polygonCoords: [
      [31.12, 28.55], [31.10, 28.65], [31.07, 28.82],
      [30.92, 28.82], [30.96, 28.65], [30.99, 28.55],
    ],
    improvementTip: 'Study Ras Al Hekma\'s key attractions — its bay, undeveloped coastline, and the major developments planned or underway.',
    landmarks: [
      { id: 'rh-1', label: 'Ras Al Hekma Bay',  lat: 31.08, lng: 28.63 },
      { id: 'rh-2', label: 'Hacienda Bay',       lat: 31.00, lng: 28.68 },
      { id: 'rh-3', label: 'Mountain View NC',   lat: 31.05, lng: 28.60 },
      { id: 'rh-4', label: 'Swan Lake (Haneya)', lat: 31.07, lng: 28.58 },
      { id: 'rh-5', label: 'Fouka Marine',       lat: 31.10, lng: 28.52 },
    ],
  },
  {
    id: 'el_dabaa',
    label: 'El Dabaa',
    center: [30.9600, 28.4240],
    bounds: [[30.92, 28.30], [31.08, 28.58]],
    polygonCoords: [
      [31.22, 28.2], [31.18, 28.35], [31.12, 28.55],
      [30.99, 28.55], [31.02, 28.35], [31.10, 28.2],
    ],
    improvementTip: 'Learn the key facts about El Dabaa — its nuclear plant proximity, infrastructure investments, and coastal properties.',
    landmarks: [
      { id: 'ed-1', label: 'El Dabaa City',       lat: 30.96, lng: 28.43 },
      { id: 'ed-2', label: 'Fouka Bay (Tatweer)', lat: 31.00, lng: 28.48 },
      { id: 'ed-3', label: 'Bo Islands',          lat: 31.02, lng: 28.52 },
      { id: 'ed-4', label: 'Blue Blue El Dabaa',  lat: 30.98, lng: 28.38 },
      { id: 'ed-5', label: 'Amwaj El Dabaa',      lat: 31.05, lng: 28.35 },
    ],
  },
  {
    id: 'sidi_abdel_rahman',
    label: 'Sidi Abdel Rahman',
    center: [30.873, 28.852],
    bounds: [[30.85, 28.77], [30.91, 28.90]],
    polygonCoords: [
      [30.892, 28.780], [30.893, 28.823], [30.890, 28.870], [30.887, 28.915],
      [30.858, 28.915], [30.855, 28.862], [30.857, 28.810], [30.862, 28.780],
    ],
    improvementTip: 'Revisit Sidi Abdel Rahman\'s hallmarks — its crystal-clear bay, luxury resort density, and proximity to Alamein.',
    landmarks: [
      { id: 'sar-1', label: 'Sidi Abdel Rahman Bay', lat: 30.878, lng: 28.858 },
      { id: 'sar-2', label: 'Hacienda White',        lat: 30.876, lng: 28.822 },
      { id: 'sar-3', label: 'La Serena Beach',       lat: 30.882, lng: 28.795 },
      { id: 'sar-4', label: 'Stella Di Mare',        lat: 30.873, lng: 28.868 },
      { id: 'sar-5', label: 'Crystal Bay',           lat: 30.885, lng: 28.843 },
    ],
  },
  {
    id: 'new_alamein',
    label: 'New Alamein',
    center: [30.857, 28.855],
    bounds: [[30.77, 28.83], [30.89, 28.98]],
    polygonCoords: [
      [30.895, 28.793],  // NW coast — Marassi point
      [30.888, 28.848],  // N coast — Plage area
      [30.877, 28.918],  // NE coast — before Marina bay
      [30.856, 28.933],  // E — east boundary (Marina excluded)
      [30.833, 28.925],  // SE — El Alamein area (just outside)
      [30.820, 28.862],  // S — Industrial area east
      [30.820, 28.805],  // S — Industrial area west
      [30.842, 28.787],  // SW
      [30.870, 28.780],  // W — west of ECHEM
    ],
    improvementTip: 'Deep-dive into New Alamein City — the towers, university, cultural district, corniche, and its status as a year-round city.',
    landmarks: [
      { id: 'na-1', label: 'Alamein International University', lat: 30.800, lng: 28.905 },
      { id: 'na-2', label: 'El Alamein Towers',                lat: 30.858, lng: 28.940 },
      { id: 'na-3', label: 'Mazarine New Alamein',             lat: 30.862, lng: 28.955 },
      { id: 'na-4', label: 'New Alamein Corniche',             lat: 30.873, lng: 28.860 },
      { id: 'na-5', label: 'Cali Coast',                      lat: 30.864, lng: 28.912 },
    ],
  },
];
