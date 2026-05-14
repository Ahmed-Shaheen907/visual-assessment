'use client';

import { useState } from 'react';
import type { PinQuizData } from '@/lib/data/pin-quizzes';

interface PinQuizPanelProps {
  quiz: PinQuizData;
  onSubmit: (answers: Record<string, string>) => void;
  submitting: boolean;
}

export default function PinQuizPanel({ quiz, onSubmit, submitting }: PinQuizPanelProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const allAnswered = quiz.questions.every((q) => answers[q.id]?.trim());

  function setAnswer(id: string, value: string) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  return (
    <div className="flex flex-col gap-3 flex-1 min-h-0">
      <p
        className="text-xs font-bold uppercase tracking-widest mb-1"
        style={{ color: 'rgba(215,255,0,0.6)', fontFamily: 'var(--font-space)' }}
      >
        Compound Quiz
      </p>

      <div className="flex flex-col gap-3 flex-1 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(215,255,0,0.2) transparent' }}>
        {quiz.questions.map((q, i) => (
          <div
            key={q.id}
            className="rounded-lg p-3"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(215,255,0,0.1)' }}
          >
            <p
              className="text-xs font-bold mb-2 leading-snug"
              style={{ color: 'var(--tgl-white)', fontFamily: 'var(--font-space)' }}
            >
              <span style={{ color: 'rgba(215,255,0,0.5)', marginRight: 6 }}>{i + 1}.</span>
              {q.question}
            </p>

            {q.type === 'freetext' && (
              <textarea
                rows={3}
                value={answers[q.id] ?? ''}
                onChange={(e) => setAnswer(q.id, e.target.value)}
                placeholder="Type your answer…"
                className="w-full rounded-md px-2 py-1.5 text-xs resize-none outline-none"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: answers[q.id]?.trim()
                    ? '1px solid rgba(215,255,0,0.35)'
                    : '1px solid rgba(255,255,255,0.1)',
                  color: 'var(--tgl-white)',
                  fontFamily: 'var(--font-montserrat)',
                  lineHeight: 1.6,
                  transition: 'border-color 0.15s',
                }}
              />
            )}

            {q.type === 'truefalse' && (
              <div className="flex gap-2">
                {['true', 'false'].map((opt) => {
                  const selected = answers[q.id] === opt;
                  return (
                    <button
                      key={opt}
                      onClick={() => setAnswer(q.id, opt)}
                      className="flex-1 py-1.5 rounded-md text-xs font-bold capitalize transition-all duration-150 active:scale-95"
                      style={{
                        background: selected ? 'var(--tgl-lime)' : 'rgba(255,255,255,0.06)',
                        color: selected ? '#000' : 'rgba(255,255,255,0.55)',
                        border: selected ? 'none' : '1px solid rgba(255,255,255,0.1)',
                        boxShadow: selected ? '0 0 8px rgba(215,255,0,0.4)' : 'none',
                        fontFamily: 'var(--font-space)',
                        cursor: 'pointer',
                      }}
                    >
                      {opt === 'true' ? 'True' : 'False'}
                    </button>
                  );
                })}
              </div>
            )}

            {q.type === 'mcq' && (
              <div className="flex flex-col gap-1.5">
                {q.options?.map((opt) => {
                  const selected = answers[q.id] === opt;
                  return (
                    <button
                      key={opt}
                      onClick={() => setAnswer(q.id, opt)}
                      className="w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-all duration-150 active:scale-[0.98]"
                      style={{
                        background: selected ? 'rgba(215,255,0,0.12)' : 'rgba(255,255,255,0.04)',
                        color: selected ? 'var(--tgl-lime)' : 'rgba(255,255,255,0.6)',
                        border: selected ? '1px solid rgba(215,255,0,0.4)' : '1px solid rgba(255,255,255,0.08)',
                        fontFamily: 'var(--font-montserrat)',
                        cursor: 'pointer',
                      }}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        disabled={!allAnswered || submitting}
        onClick={() => allAnswered && !submitting && onSubmit(answers)}
        className="mt-1 w-full py-2.5 rounded-lg text-sm font-bold transition-all duration-200 active:scale-95 shrink-0"
        style={{
          fontFamily: 'var(--font-space)',
          background: allAnswered && !submitting ? 'var(--tgl-lime)' : 'rgba(215,255,0,0.06)',
          color: allAnswered && !submitting ? '#000' : 'rgba(215,255,0,0.3)',
          border: allAnswered && !submitting ? 'none' : '1px solid rgba(215,255,0,0.15)',
          boxShadow: allAnswered && !submitting ? 'var(--glow-lime)' : 'none',
          cursor: allAnswered && !submitting ? 'pointer' : 'not-allowed',
        }}
      >
        {submitting ? 'Saving…' : allAnswered ? '✓ Submit Quiz' : `${Object.keys(answers).filter(k => answers[k]?.trim()).length}/${quiz.questions.length} Answered`}
      </button>
    </div>
  );
}
