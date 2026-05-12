'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { getSessionResults } from '@/lib/supabase-helpers';
import type { Session, Answer } from '@/lib/supabase-helpers';
import { SECTIONS } from '@/lib/data/landmarks';
import { QUESTIONS } from '@/lib/data/questions';

const PASS_THRESHOLD = 0.7;

interface SectionScore {
  key: string;
  label: string;
  correct: number;
  total: number;
  pct: number;
  tip: string;
}

function computeScores(answers: Answer[]): SectionScore[] {
  const scores: SectionScore[] = [];

  // Phase 0
  const p0 = answers.filter((a) => a.phase === 'phase0');
  if (p0.length > 0) {
    const correct = p0.filter((a) => a.correct).length;
    scores.push({
      key: 'phase0',
      label: 'Overview Map',
      correct,
      total: p0.length,
      pct: correct / p0.length,
      tip: 'Review the positions of all 6 North Coast locations on the map.',
    });
  }

  // Phase 1 — one entry per section
  for (const section of SECTIONS) {
    const phaseKey = `phase1_${section.id}`;
    const sa = answers.filter((a) => a.phase === phaseKey);
    if (sa.length > 0) {
      const correct = sa.filter((a) => a.correct).length;
      scores.push({
        key: phaseKey,
        label: section.label,
        correct,
        total: sa.length,
        pct: correct / sa.length,
        tip: section.improvementTip,
      });
    }
  }

  // Phase 2 — quiz
  const p2 = answers.filter((a) => a.phase === 'phase2');
  if (p2.length > 0) {
    const correct = p2.filter((a) => a.correct).length;
    scores.push({
      key: 'phase2',
      label: 'Knowledge Quiz',
      correct,
      total: p2.length,
      pct: correct / p2.length,
      tip: 'Review the quiz questions and correct answers to strengthen your product knowledge.',
    });
  }

  return scores;
}

function computeOverall(scores: SectionScore[]): number {
  if (!scores.length) return 0;
  const totalCorrect = scores.reduce((s, x) => s + x.correct, 0);
  const totalQ = scores.reduce((s, x) => s + x.total, 0);
  return totalQ > 0 ? totalCorrect / totalQ : 0;
}

function getBestWorst(scores: SectionScore[]) {
  if (scores.length < 2) return { best: null, worst: null };
  const sorted = [...scores].sort((a, b) => b.pct - a.pct);
  return { best: sorted[0], worst: sorted[sorted.length - 1] };
}

function ScoreBar({ pct }: { pct: number }) {
  const color = pct >= PASS_THRESHOLD ? 'var(--tgl-lime)' : '#ef4444';
  return (
    <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden', width: 80 }}>
      <div style={{ width: `${Math.round(pct * 100)}%`, height: '100%', background: color, borderRadius: 99, transition: 'width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)' }} />
    </div>
  );
}

export default function ResultsPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [session, setSession] = useState<Session | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);

  useEffect(() => {
    if (!sessionId) return;
    getSessionResults(sessionId)
      .then(({ session, answers }) => { setSession(session); setAnswers(answers); })
      .catch(() => setError('Could not load results. Please try again.'))
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--tgl-black)' }}>
        <div className="text-sm" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-montserrat)' }}>Loading results…</div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--tgl-black)' }}>
        <div className="text-sm text-center" style={{ color: '#ef4444', fontFamily: 'var(--font-montserrat)' }}>{error || 'Session not found.'}</div>
      </div>
    );
  }

  const scores = computeScores(answers);
  const overall = computeOverall(scores);
  const { best, worst } = getBestWorst(scores);
  const weakSections = scores.filter((s) => s.pct < PASS_THRESHOLD);
  const completedAt = session.completed_at ? new Date(session.completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'In progress';

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
            <h1 className="text-lg font-bold tracking-tight leading-none" style={{ fontFamily: 'var(--font-space)', color: 'var(--tgl-white)' }}>
              Assessment Report
            </h1>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-montserrat)' }}>
              {session.name} · {completedAt}
            </p>
          </div>
        </div>
        <div
          className="px-4 py-1.5 rounded-full text-sm font-bold"
          style={{
            border: `1px solid ${overall >= PASS_THRESHOLD ? 'rgba(215,255,0,0.3)' : 'rgba(239,68,68,0.3)'}`,
            color: overall >= PASS_THRESHOLD ? 'var(--tgl-lime)' : '#ef4444',
            background: overall >= PASS_THRESHOLD ? 'rgba(215,255,0,0.06)' : 'rgba(239,68,68,0.06)',
            fontFamily: 'var(--font-space)',
          }}
        >
          {Math.round(overall * 100)}% Overall
        </div>
      </header>

      <div className="flex-1 px-6 py-8 max-w-3xl mx-auto w-full">

        {/* Overall score card */}
        <div
          className="rounded-2xl p-6 mb-8"
          style={{ background: '#0d0d0d', border: '1px solid rgba(215,255,0,0.12)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: 'rgba(215,255,0,0.6)', fontFamily: 'var(--font-space)' }}>
              Overall Score
            </h2>
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-montserrat)' }}>
              {scores.reduce((s, x) => s + x.correct, 0)} / {scores.reduce((s, x) => s + x.total, 0)} correct
            </span>
          </div>
          <div
            className="text-6xl font-black mb-2"
            style={{
              fontFamily: 'var(--font-space)',
              color: overall >= PASS_THRESHOLD ? 'var(--tgl-lime)' : '#ef4444',
              letterSpacing: '-0.04em',
              lineHeight: 1,
            }}
          >
            {Math.round(overall * 100)}%
          </div>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-montserrat)' }}>
            {overall >= 0.9 ? 'Outstanding! You know the North Coast inside out.' :
             overall >= PASS_THRESHOLD ? 'Good work. A few areas to polish.' :
             'Needs improvement. Review the sections below.'}
          </p>

          {/* Best / Worst callout */}
          {best && worst && (
            <div className="flex gap-4 mt-5">
              <div className="flex-1 p-3 rounded-xl" style={{ background: 'rgba(215,255,0,0.06)', border: '1px solid rgba(215,255,0,0.15)' }}>
                <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'rgba(215,255,0,0.6)', fontFamily: 'var(--font-space)' }}>Strongest</div>
                <div className="text-sm font-bold" style={{ color: 'var(--tgl-white)', fontFamily: 'var(--font-space)' }}>{best.label}</div>
                <div className="text-xs mt-0.5" style={{ color: 'rgba(215,255,0,0.8)', fontFamily: 'var(--font-montserrat)' }}>{Math.round(best.pct * 100)}%</div>
              </div>
              <div className="flex-1 p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
                <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'rgba(239,68,68,0.7)', fontFamily: 'var(--font-space)' }}>Needs Work</div>
                <div className="text-sm font-bold" style={{ color: 'var(--tgl-white)', fontFamily: 'var(--font-space)' }}>{worst.label}</div>
                <div className="text-xs mt-0.5" style={{ color: '#ef4444', fontFamily: 'var(--font-montserrat)' }}>{Math.round(worst.pct * 100)}%</div>
              </div>
            </div>
          )}
        </div>

        {/* Section breakdown table */}
        <div className="rounded-2xl overflow-hidden mb-8" style={{ border: '1px solid rgba(215,255,0,0.1)' }}>
          <div className="px-5 py-3" style={{ background: '#0d0d0d', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(215,255,0,0.6)', fontFamily: 'var(--font-space)' }}>
              Section Breakdown
            </h2>
          </div>
          {scores.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm" style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-montserrat)' }}>
              No answers recorded yet.
            </div>
          ) : (
            scores.map((s, i) => {
              const passing = s.pct >= PASS_THRESHOLD;
              return (
                <div
                  key={s.key}
                  className="flex items-center gap-4 px-5 py-4"
                  style={{
                    borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                    background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                  }}
                >
                  <div className="flex-1">
                    <div className="text-sm font-bold" style={{ color: 'var(--tgl-white)', fontFamily: 'var(--font-space)' }}>
                      {s.label}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-montserrat)' }}>
                      {s.correct}/{s.total} correct
                    </div>
                  </div>
                  <ScoreBar pct={s.pct} />
                  <div
                    className="text-sm font-bold w-12 text-right"
                    style={{ color: passing ? 'var(--tgl-lime)' : '#ef4444', fontFamily: 'var(--font-space)' }}
                  >
                    {Math.round(s.pct * 100)}%
                  </div>
                  <div
                    className="text-xs px-2 py-0.5 rounded-full font-bold"
                    style={{
                      background: passing ? 'rgba(215,255,0,0.1)' : 'rgba(239,68,68,0.1)',
                      color: passing ? 'var(--tgl-lime)' : '#ef4444',
                      border: `1px solid ${passing ? 'rgba(215,255,0,0.2)' : 'rgba(239,68,68,0.2)'}`,
                      fontFamily: 'var(--font-space)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {passing ? '✓ Pass' : '⚠ Review'}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Improvement tips */}
        {weakSections.length > 0 && (
          <div className="rounded-2xl overflow-hidden mb-8" style={{ border: '1px solid rgba(239,68,68,0.15)' }}>
            <div className="px-5 py-3" style={{ background: 'rgba(239,68,68,0.05)', borderBottom: '1px solid rgba(239,68,68,0.1)' }}>
              <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(239,68,68,0.8)', fontFamily: 'var(--font-space)' }}>
                Improvement Areas
              </h2>
            </div>
            {weakSections.map((s, i) => (
              <div
                key={s.key}
                className="px-5 py-4 flex gap-4 items-start"
                style={{ borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}
              >
                <div
                  className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold mt-0.5"
                  style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', fontFamily: 'var(--font-space)' }}
                >
                  !
                </div>
                <div>
                  <div className="text-sm font-bold mb-1" style={{ color: 'var(--tgl-white)', fontFamily: 'var(--font-space)' }}>
                    {s.label} — {Math.round(s.pct * 100)}%
                  </div>
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.55)', fontFamily: 'var(--font-montserrat)', lineHeight: 1.6 }}>
                    {s.tip}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Retake button */}
        <div className="flex gap-3">
          <a
            href="/"
            className="flex-1 py-3 rounded-xl text-sm font-bold text-center transition-all duration-150"
            style={{
              background: 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.6)',
              border: '1px solid rgba(255,255,255,0.12)',
              fontFamily: 'var(--font-space)',
            }}
          >
            Retake Assessment
          </a>
        </div>
      </div>
    </main>
  );
}
