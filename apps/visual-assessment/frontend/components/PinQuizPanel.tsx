'use client';

import { useState, useCallback, CSSProperties } from 'react';
import type { PinQuizData } from '@/lib/data/pin-quizzes';

interface PinQuizPanelProps {
  quiz: PinQuizData;
  onSubmit: (answers: Record<string, string>) => void;
  submitting: boolean;
}

export default function PinQuizPanel({ quiz, onSubmit, submitting }: PinQuizPanelProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [cardStyle, setCardStyle] = useState<CSSProperties>({
    transform: 'translateX(0)',
    opacity: 1,
  });
  const [advancing, setAdvancing] = useState(false);

  const q = quiz.questions[currentIndex];
  const isLast = currentIndex === quiz.questions.length - 1;
  const currentAnswer = answers[q?.id ?? ''] ?? '';

  const advance = useCallback(() => {
    if (advancing) return;
    setAdvancing(true);
    // Slide current card out to the left
    setCardStyle({ transform: 'translateX(-60px)', opacity: 0, transition: 'transform 0.25s ease, opacity 0.2s ease' });
    setTimeout(() => {
      setCurrentIndex((i) => i + 1);
      // Place next card off-screen to the right (no transition)
      setCardStyle({ transform: 'translateX(40px)', opacity: 0, transition: 'none' });
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          // Slide in from the right with spring
          setCardStyle({
            transform: 'translateX(0)',
            opacity: 1,
            transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease',
          });
          setAdvancing(false);
        })
      );
    }, 260);
  }, [advancing]);

  function setAnswer(id: string, value: string) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  function handleSelect(id: string, value: string) {
    setAnswer(id, value);
    if (!isLast) {
      setTimeout(advance, 350);
    }
  }

  function handleContinue() {
    if (isLast) {
      onSubmit({ ...answers });
    } else {
      advance();
    }
  }

  if (!q) return null;

  const dotColors = quiz.questions.map((_, i) =>
    i < currentIndex
      ? 'var(--tgl-lime)'
      : i === currentIndex
      ? 'rgba(215,255,0,0.55)'
      : 'rgba(255,255,255,0.15)'
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: 16 }}>

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'rgba(215,255,0,0.6)',
            fontFamily: 'var(--font-space)',
          }}
        >
          Compound Quiz
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-space)' }}>
            {currentIndex + 1} / {quiz.questions.length}
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            {dotColors.map((color, i) => (
              <div
                key={i}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: color,
                  transition: 'background 0.3s ease',
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Animated question card */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', position: 'relative' }}>
        <div style={{ ...cardStyle, height: '100%' }}>
          <div
            style={{
              borderRadius: 12,
              padding: 20,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(215,255,0,0.12)',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              height: '100%',
              boxSizing: 'border-box',
            }}
          >
            <p
              style={{
                fontSize: 14,
                fontWeight: 700,
                lineHeight: 1.5,
                color: 'var(--tgl-white)',
                fontFamily: 'var(--font-space)',
                margin: 0,
              }}
            >
              {q.question}
            </p>

            {q.type === 'freetext' && (
              <textarea
                rows={4}
                value={currentAnswer}
                onChange={(e) => setAnswer(q.id, e.target.value)}
                placeholder="Type your answer…"
                style={{
                  width: '100%',
                  borderRadius: 8,
                  padding: '10px 12px',
                  fontSize: 13,
                  resize: 'none',
                  outline: 'none',
                  background: 'rgba(255,255,255,0.06)',
                  border: currentAnswer.trim()
                    ? '1px solid rgba(215,255,0,0.4)'
                    : '1px solid rgba(255,255,255,0.1)',
                  color: 'var(--tgl-white)',
                  fontFamily: 'var(--font-montserrat)',
                  lineHeight: 1.6,
                  transition: 'border-color 0.15s',
                  boxSizing: 'border-box',
                }}
              />
            )}

            {q.type === 'truefalse' && (
              <div style={{ display: 'flex', gap: 10 }}>
                {['true', 'false'].map((opt) => {
                  const selected = currentAnswer === opt;
                  return (
                    <button
                      key={opt}
                      onClick={() => handleSelect(q.id, opt)}
                      style={{
                        flex: 1,
                        padding: '12px 0',
                        borderRadius: 10,
                        fontSize: 13,
                        fontWeight: 700,
                        fontFamily: 'var(--font-space)',
                        cursor: 'pointer',
                        transition: 'background 0.15s, box-shadow 0.15s, transform 0.1s',
                        transform: selected ? 'scale(1.02)' : 'scale(1)',
                        background: selected ? 'var(--tgl-lime)' : 'rgba(255,255,255,0.06)',
                        color: selected ? '#000' : 'rgba(255,255,255,0.6)',
                        border: selected ? 'none' : '1px solid rgba(255,255,255,0.1)',
                        boxShadow: selected ? '0 0 12px rgba(215,255,0,0.5)' : 'none',
                      }}
                    >
                      {opt === 'true' ? 'True' : 'False'}
                    </button>
                  );
                })}
              </div>
            )}

            {q.type === 'mcq' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {q.options?.map((opt) => {
                  const selected = currentAnswer === opt;
                  return (
                    <button
                      key={opt}
                      onClick={() => handleSelect(q.id, opt)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '11px 14px',
                        borderRadius: 10,
                        fontSize: 13,
                        fontFamily: 'var(--font-montserrat)',
                        cursor: 'pointer',
                        transition: 'background 0.15s, color 0.15s, transform 0.1s',
                        transform: selected ? 'scale(1.01)' : 'scale(1)',
                        background: selected ? 'rgba(215,255,0,0.14)' : 'rgba(255,255,255,0.04)',
                        color: selected ? 'var(--tgl-lime)' : 'rgba(255,255,255,0.65)',
                        border: selected ? '1px solid rgba(215,255,0,0.45)' : '1px solid rgba(255,255,255,0.08)',
                        boxShadow: selected ? '0 0 10px rgba(215,255,0,0.15)' : 'none',
                      }}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Continue / Submit — only for freetext or last question */}
      {(q.type === 'freetext' || isLast) && (
        <button
          disabled={!currentAnswer.trim() || submitting || advancing}
          onClick={handleContinue}
          style={{
            flexShrink: 0,
            width: '100%',
            padding: '13px 0',
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 700,
            fontFamily: 'var(--font-space)',
            cursor: currentAnswer.trim() && !submitting && !advancing ? 'pointer' : 'not-allowed',
            transition: 'background 0.2s, box-shadow 0.2s',
            background: currentAnswer.trim() && !submitting && !advancing
              ? 'var(--tgl-lime)'
              : 'rgba(215,255,0,0.06)',
            color: currentAnswer.trim() && !submitting && !advancing
              ? '#000'
              : 'rgba(215,255,0,0.3)',
            border: currentAnswer.trim() && !submitting && !advancing
              ? 'none'
              : '1px solid rgba(215,255,0,0.15)',
            boxShadow: currentAnswer.trim() && !submitting && !advancing
              ? 'var(--glow-lime)'
              : 'none',
          }}
        >
          {submitting ? 'Saving…' : isLast ? '✓ Submit Quiz' : 'Continue →'}
        </button>
      )}
    </div>
  );
}
