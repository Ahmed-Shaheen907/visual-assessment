import type { Question } from './questions';

export interface PinQuizData {
  landmarkId: string;
  masterPlanImage: string;
  overlayBounds: [[number, number], [number, number]];
  focusBounds: [[number, number], [number, number]];
  questions: Question[];
}

export const PIN_QUIZZES: PinQuizData[] = [
  {
    landmarkId: 'sh-4',
    masterPlanImage: '/marsa-baghoush.jpeg',
    overlayBounds: [[31.175, 27.652], [31.180, 27.662]],
    focusBounds: [[31.172, 27.645], [31.183, 27.670]],
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
