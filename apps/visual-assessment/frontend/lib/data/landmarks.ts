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
  landmarks: Landmark[];
  improvementTip: string;
}

export const SECTIONS: Section[] = [
  {
    id: 'marsa_matrouh',
    label: 'Marsa Matrouh',
    center: [31.3543, 27.2373],
    bounds: [[31.15, 26.80], [31.55, 27.65]],
    improvementTip: 'Focus on studying the coastal landmarks and key selling points of Marsa Matrouh — its beaches, marina, and proximity to Siwa.',
    landmarks: [
      // TODO: add { id: 'mm-1', label: 'Example Landmark', lat: 31.35, lng: 27.23 }
    ],
  },
  {
    id: 'sidi_heneish',
    label: 'Sidi Heneish',
    center: [31.2430, 27.9350],
    bounds: [[31.05, 27.60], [31.45, 28.25]],
    improvementTip: 'Review the unique features and real estate projects in Sidi Heneish, including beach access and community amenities.',
    landmarks: [],
  },
  {
    id: 'ras_al_hekma',
    label: 'Ras Al Hekma',
    center: [31.1150, 28.6330],
    bounds: [[30.95, 28.35], [31.30, 28.95]],
    improvementTip: 'Study Ras Al Hekma\'s key attractions — its bay, undeveloped coastline, and the major developments planned or underway.',
    landmarks: [],
  },
  {
    id: 'el_dabaa',
    label: 'El Dabaa',
    center: [30.9600, 28.4240],
    bounds: [[30.78, 28.15], [31.15, 28.70]],
    improvementTip: 'Learn the key facts about El Dabaa — its nuclear plant proximity, infrastructure investments, and coastal properties.',
    landmarks: [],
  },
  {
    id: 'sidi_abdel_rahman',
    label: 'Sidi Abdel Rahman',
    center: [30.8770, 28.7240],
    bounds: [[30.70, 28.50], [31.05, 28.95]],
    improvementTip: 'Revisit Sidi Abdel Rahman\'s hallmarks — its crystal-clear bay, luxury resort density, and proximity to Alamein.',
    landmarks: [],
  },
  {
    id: 'new_alamein',
    label: 'New Alamein',
    center: [30.8430, 29.0120],
    bounds: [[30.65, 28.78], [31.04, 29.25]],
    improvementTip: 'Deep-dive into New Alamein City — the towers, university, cultural district, corniche, and its status as a year-round city.',
    landmarks: [],
  },
];
