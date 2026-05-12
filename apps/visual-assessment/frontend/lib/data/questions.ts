export type QuestionType = 'mcq' | 'truefalse' | 'freetext';

export interface Question {
  id: string;
  type: QuestionType;
  section: string; // matches Section.id from landmarks.ts, or 'general'
  question: string;
  options?: string[];       // mcq only
  answer: string;           // correct answer (exact string match for mcq/tf, used as reference for freetext)
  tip: string;              // shown on results if wrong
}

// TODO: Replace placeholder questions with real content from client
export const QUESTIONS: Question[] = [
  {
    id: 'q1',
    type: 'mcq',
    section: 'new_alamein',
    question: 'What is the name of the university located in New Alamein City?',
    options: ['Alamein International University', 'Cairo University North Branch', 'Alexandria Coastal University', 'October University Alamein'],
    answer: 'Alamein International University',
    tip: 'New Alamein City has Alamein International University (AIU) as a key landmark and selling point for families.',
  },
  {
    id: 'q2',
    type: 'truefalse',
    section: 'ras_al_hekma',
    question: 'Ras Al Hekma Bay is considered one of the most beautiful natural bays on the Mediterranean coast.',
    answer: 'true',
    tip: 'Ras Al Hekma is known for its pristine natural bay — a major USP for any property in the area.',
  },
  {
    id: 'q3',
    type: 'freetext',
    section: 'general',
    question: 'Name one major real estate developer that has a project on the North Coast.',
    answer: '',
    tip: 'Key developers on the North Coast include Emaar, Tatweer Misr, Ora Developers, and Palm Hills.',
  },
  // TODO: Add more questions here
];
