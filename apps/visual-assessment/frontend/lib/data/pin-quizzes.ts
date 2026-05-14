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
    masterPlanImage: '/marsa-baghoush.png',
    focusPoint: { lat: 31.1774707, lng: 27.656592, zoom: 17 },
    questions: [
      {
        id: 'mb-q1',
        type: 'freetext',
        section: 'sidi_heneish',
        question: 'Who is the developer of Marsa Baghoush?',
        answer: '',
        tip: 'Look up the official developer behind the Marsa Baghoush resort project on the North Coast.',
      },
      {
        id: 'mb-q2',
        type: 'truefalse',
        section: 'sidi_heneish',
        question: 'Marsa Baghoush is located directly on the Mediterranean Sea.',
        answer: 'true',
        tip: 'Marsa Baghoush is a beachfront resort with direct sea access.',
      },
      {
        id: 'mb-q3',
        type: 'mcq',
        section: 'sidi_heneish',
        question: 'What category best describes Marsa Baghoush?',
        options: ['Luxury beach resort', 'Urban apartment towers', 'Desert eco-lodge', 'Industrial free zone'],
        answer: 'Luxury beach resort',
        tip: 'Marsa Baghoush is a high-end coastal compound designed as a resort-style community.',
      },
      {
        id: 'mb-q4',
        type: 'freetext',
        section: 'sidi_heneish',
        question: 'Describe in 2–3 sentences the main selling points of Marsa Baghoush as a North Coast property.',
        answer: '',
        tip: 'Consider factors like location, amenities, sea access, and resort lifestyle.',
      },
    ],
  },
];
