import type { Question } from './questions';

export interface PinQuizData {
  landmarkId: string;
  masterPlanImage: string;
  focusPoint: { lat: number; lng: number; zoom: number };
  questions: Question[];
}

export const PIN_QUIZZES: PinQuizData[] = [
  {
    landmarkId: 'sh-4',
    masterPlanImage: '/Final marsa-baghoush.png',
    focusPoint: { lat: 31.1774707, lng: 27.656592, zoom: 17 },
    questions: [
      {
        id: 'mb-q1',
        type: 'freetext',
        section: 'sidi_heneish',
        question: 'Who is the developer of Marsa Baghoush?',
        answer: '',
        tip: 'Know your developer — it builds client trust and credibility.',
      },
      {
        id: 'mb-q2',
        type: 'freetext',
        section: 'sidi_heneish',
        question: 'What is the total land area of the project?',
        answer: '',
        tip: 'The total land area is a key detail clients ask about to understand the scale of the development.',
      },
      {
        id: 'mb-q3',
        type: 'mcq',
        section: 'sidi_heneish',
        question: 'What is the km marker of Marsa Baghoush on the North Coast road?',
        options: ['200 km', '238 km', '247 km', '253 km'],
        answer: '238 km',
        tip: 'Marsa Baghoush is located at the 238 km mark on the North Coast road.',
      },
      {
        id: 'mb-q4',
        type: 'multiselect',
        section: 'sidi_heneish',
        question: 'Which unit types are available at Marsa Baghoush? Select all that apply.',
        options: ['Chalet', 'Chalet Villa', 'Junior Villa', 'Standalone', 'Twin House', 'Townhouse'],
        answer: ['Chalet', 'Chalet Villa', 'Junior Villa', 'Standalone'],
        tip: 'Marsa Baghoush offers Chalets, Chalet Villas, Junior Villas, and Standalone units.',
      },
      {
        id: 'mb-q5',
        type: 'truefalse',
        section: 'sidi_heneish',
        question: 'Does Marsa Baghoush offer one-bedroom units?',
        answer: 'false',
        tip: 'Marsa Baghoush does not have one-bedroom units — the smallest unit type starts at two bedrooms.',
      },
      {
        id: 'mb-q6',
        type: 'mcq',
        section: 'sidi_heneish',
        question: 'What is the starting built-up area for two-bedroom units?',
        options: ['80 sqm', '100 sqm', '110 sqm', '115 sqm'],
        answer: '100 sqm',
        tip: 'Two-bedroom units at Marsa Baghoush start from 100 sqm.',
      },
      {
        id: 'mb-q7',
        type: 'pricegroup',
        section: 'sidi_heneish',
        question: 'What are the starting prices for each unit type?',
        items: ['Two-Bedroom', 'Three-Bedroom', 'Junior Villa', 'Standalone'],
        answer: '',
        tip: 'Knowing starting prices for each unit type is essential for qualifying clients quickly.',
      },
      {
        id: 'mb-q8',
        type: 'mcq',
        section: 'sidi_heneish',
        question: 'What is the finishing specification for all units?',
        options: ['Fully Finished', 'Fully Finished with AC'],
        answer: 'Fully Finished',
        tip: 'All units at Marsa Baghoush are delivered Fully Finished.',
      },
    ],
  },
];
