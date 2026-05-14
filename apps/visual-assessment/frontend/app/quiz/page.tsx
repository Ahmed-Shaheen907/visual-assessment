'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import QuizQuestion from '@/components/QuizQuestion';
import { QUESTIONS } from '@/lib/data/questions';
import { saveAnswers, markSessionComplete } from '@/lib/supabase-helpers';

export default function QuizPage() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<(string | null)[]>(Array(QUESTIONS.length).fill(null));
  const [finishing, setFinishing] = useState(false);

  const question = QUESTIONS[currentIndex];
  const answered = answers[currentIndex];
  const progress = ((currentIndex) / QUESTIONS.length) * 100;
  const isLast = currentIndex === QUESTIONS.length - 1;

  function handleAnswer(answer: string) {
    setAnswers((prev) => {
      const next = [...prev];
      next[currentIndex] = answer;
      return next;
    });
  }

  async function handleNext() {
    if (!answered) return;
    if (isLast) {
      setFinishing(true);
      const sessionId = localStorage.getItem('va_session_id');
      if (sessionId) {
        await saveAnswers(
          sessionId,
          QUESTIONS.map((q, i) => ({
            phase: 'phase2',
            question_id: q.id,
            answer_given: answers[i],
            correct: q.type === 'freetext' ? true : answers[i]?.toLowerCase() === (q.answer as string).toLowerCase(),
          }))
        );
        await markSessionComplete(sessionId);
        router.push(`/results/${sessionId}`);
      }
    } else {
      setCurrentIndex((i) => i + 1);
    }
  }

  if (QUESTIONS.length === 0) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8" style={{ background: 'var(--tgl-black)' }}>
        <div className="text-center max-w-md">
          <div style={{ fontSize: 40, marginBottom: 16 }}>📝</div>
          <h1 className="text-2xl font-bold mb-3" style={{ fontFamily: 'var(--font-space)', color: 'var(--tgl-white)' }}>
            Quiz Coming Soon
          </h1>
          <p className="text-sm mb-8" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-montserrat)', lineHeight: 1.7 }}>
            Questions are being prepared. Check back soon.
          </p>
          <button
            onClick={async () => {
              const sessionId = localStorage.getItem('va_session_id');
              if (sessionId) {
                await markSessionComplete(sessionId);
                router.push(`/results/${sessionId}`);
              }
            }}
            className="px-8 py-3 rounded-xl text-sm font-bold transition-all duration-150 active:scale-95"
            style={{ background: 'var(--tgl-lime)', color: '#000', boxShadow: 'var(--glow-lime-sm)', fontFamily: 'var(--font-space)' }}
          >
            See My Results →
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col" style={{ background: 'var(--tgl-black)' }}>
      {/* Header */}
      <header
        className="px-6 py-4 flex items-center justify-between shrink-0"
        style={{ borderBottom: '1px solid rgba(215,255,0,0.12)' }}
      >
        <div className="flex items-center gap-3">
          <Image src="/tgl-logo.png" alt="TGL" width={36} height={36} className="object-contain" />
          <div>
            <h1
              className="text-lg font-bold tracking-tight leading-none"
              style={{ fontFamily: 'var(--font-space)', color: 'var(--tgl-white)' }}
            >
              Knowledge Quiz
            </h1>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-montserrat)' }}>
              Phase 2 — North Coast Assessment
            </p>
          </div>
        </div>
        <div
          className="flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold"
          style={{ border: '1px solid rgba(215,255,0,0.3)', fontFamily: 'var(--font-space)', color: 'var(--tgl-lime)', background: 'rgba(215,255,0,0.06)' }}
        >
          {currentIndex + 1} <span style={{ color: 'rgba(255,255,255,0.3)' }}>/</span> {QUESTIONS.length}
        </div>
      </header>

      {/* Progress bar */}
      <div className="shrink-0 px-6 pt-3 pb-1">
        <div
          className="w-full rounded-full overflow-hidden"
          style={{ height: 4, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(215,255,0,0.1)' }}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${progress}%`,
              background: 'var(--tgl-lime)',
              boxShadow: progress > 0 ? '0 0 8px rgba(215,255,0,0.6)' : 'none',
              transition: 'width 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          />
        </div>
      </div>

      {/* Question area */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-12">
        <QuizQuestion
          question={question}
          index={currentIndex}
          total={QUESTIONS.length}
          onAnswer={handleAnswer}
          answered={answered}
        />

        {/* Next / Finish button — appears after answering */}
        {answered && (
          <div className="mt-10 w-full max-w-2xl">
            <button
              onClick={handleNext}
              disabled={finishing}
              className="w-full py-4 rounded-xl text-sm font-black uppercase tracking-widest transition-all duration-150 active:scale-95"
              style={{
                background: finishing ? 'rgba(215,255,0,0.08)' : 'var(--tgl-lime)',
                color: finishing ? 'rgba(215,255,0,0.4)' : '#000',
                boxShadow: finishing ? 'none' : 'var(--glow-lime)',
                fontFamily: 'var(--font-space)',
                letterSpacing: '0.08em',
                cursor: finishing ? 'not-allowed' : 'pointer',
              }}
            >
              {finishing ? 'Saving results…' : isLast ? 'Finish & See Results →' : 'Next Question →'}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
