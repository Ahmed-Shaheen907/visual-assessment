'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { getSessionResults } from '@/lib/supabase-helpers';
import type { Session, Answer } from '@/lib/supabase-helpers';
import { SECTIONS } from '@/lib/data/landmarks';
import { QUESTIONS } from '@/lib/data/questions';
import { PIN_QUIZZES } from '@/lib/data/pin-quizzes';

const PASS_THRESHOLD = 0.7;

// ─── Lookup maps ──────────────────────────────────────────────────────────────

const PHASE0_LABELS: Record<string, string> = {};
SECTIONS.forEach((s, i) => { PHASE0_LABELS[`zone-${i + 1}`] = s.label; });

const LANDMARK_LABELS: Record<string, string> = {};
SECTIONS.forEach(s => s.landmarks.forEach(lm => { LANDMARK_LABELS[lm.id] = lm.label; }));

const QUESTION_MAP: Record<string, typeof QUESTIONS[0]> = {};
QUESTIONS.forEach(q => { QUESTION_MAP[q.id] = q; });

const PIN_QUESTION_LABELS: Record<string, string> = {};
const PIN_CORRECT_ANSWERS: Record<string, string> = {};
PIN_QUIZZES.forEach(pq => pq.questions.forEach(q => {
  PIN_QUESTION_LABELS[q.id] = q.question;
  if (q.type === 'multiselect' && Array.isArray(q.answer)) {
    PIN_CORRECT_ANSWERS[q.id] = (q.answer as string[]).join(', ');
  } else if (q.type === 'freetext' || q.type === 'pricegroup') {
    PIN_CORRECT_ANSWERS[q.id] = '';
  } else {
    PIN_CORRECT_ANSWERS[q.id] = q.answer as string;
  }
}));

// ─── Types ────────────────────────────────────────────────────────────────────

interface SectionScore {
  key: string;
  label: string;
  correct: number;
  total: number;
  pct: number;
  tip: string;
}

interface AnswerRow {
  questionLabel: string;
  given: string | null;
  correct: boolean | null; // null = unscored (freetext/pricegroup with no correct answer)
  correctAnswer: string;
}

interface SubGroup {
  key: string;
  label: string;
  rows: AnswerRow[];
  score: { correct: number; total: number };
}

interface PhaseGroup {
  key: string;
  label: string;
  rows: AnswerRow[];
  score: { correct: number; total: number };
  subGroups?: SubGroup[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatAnswerGiven(raw: string | null): string | null {
  if (raw === null) return null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.join(', ');
    if (typeof parsed === 'object' && parsed !== null) {
      return Object.entries(parsed as Record<string, string>)
        .map(([k, v]) => `${k}: ${v}`)
        .join(' | ');
    }
  } catch { /* plain string */ }
  return raw;
}

function scoreRows(rows: AnswerRow[]): { correct: number; total: number } {
  const scorable = rows.filter(r => r.correct !== null);
  return { correct: scorable.filter(r => r.correct === true).length, total: scorable.length };
}

function computeScores(answers: Answer[]): SectionScore[] {
  const scores: SectionScore[] = [];

  const p0 = answers.filter((a) => a.phase === 'phase0');
  if (p0.length > 0) {
    const correct = p0.filter((a) => a.correct).length;
    scores.push({ key: 'phase0', label: 'Overview Map', correct, total: p0.length, pct: correct / p0.length, tip: 'Review the positions of all 6 North Coast locations on the map.' });
  }

  for (const section of SECTIONS) {
    const phaseKey = `phase1_${section.id}`;
    const sa = answers.filter((a) => a.phase === phaseKey);
    if (sa.length > 0) {
      const correct = sa.filter((a) => a.correct).length;
      scores.push({ key: phaseKey, label: section.label, correct, total: sa.length, pct: correct / sa.length, tip: section.improvementTip });
    }
  }

  for (const pq of PIN_QUIZZES) {
    const phaseKey = `phase1_pin_${pq.landmarkId}`;
    const pa = answers.filter(a => a.phase === phaseKey);
    if (pa.length === 0) continue;
    const scorableQIds = new Set(
      pq.questions.filter(q => PIN_CORRECT_ANSWERS[q.id] !== '').map(q => q.id)
    );
    const scorable = pa.filter(a => scorableQIds.has(a.question_id));
    const correct = scorable.filter(a => a.correct).length;
    const total = scorable.length;
    if (total === 0) continue;
    const landmarkLabel = LANDMARK_LABELS[pq.landmarkId] ?? pq.landmarkId;
    scores.push({ key: phaseKey, label: `${landmarkLabel} — Project Quiz`, correct, total, pct: correct / total, tip: `Review the project-specific details for ${landmarkLabel}.` });
  }

  const p2 = answers.filter((a) => a.phase === 'phase2');
  if (p2.length > 0) {
    const correct = p2.filter((a) => a.correct).length;
    scores.push({ key: 'phase2', label: 'Knowledge Quiz', correct, total: p2.length, pct: correct / p2.length, tip: 'Review the quiz questions and correct answers to strengthen your product knowledge.' });
  }

  return scores;
}

function buildAnswerReview(answers: Answer[]): PhaseGroup[] {
  const groups: PhaseGroup[] = [];

  const p0 = answers.filter(a => a.phase === 'phase0');
  if (p0.length > 0) {
    const rows: AnswerRow[] = p0.map(a => ({
      questionLabel: PHASE0_LABELS[a.question_id] ?? a.question_id,
      given: a.answer_given,
      correct: a.correct,
      correctAnswer: PHASE0_LABELS[a.question_id] ?? a.question_id,
    }));
    groups.push({ key: 'phase0', label: 'Overview Map', rows, score: scoreRows(rows) });
  }

  for (const section of SECTIONS) {
    const phaseKey = `phase1_${section.id}`;
    const sa = answers.filter(a => a.phase === phaseKey);
    if (sa.length === 0) continue;

    const rows: AnswerRow[] = sa.map(a => ({
      questionLabel: LANDMARK_LABELS[a.question_id] ?? a.question_id,
      given: a.answer_given,
      correct: a.correct,
      correctAnswer: LANDMARK_LABELS[a.question_id] ?? a.question_id,
    }));

    // Pin quiz sub-groups for landmarks in this section
    const subGroups: SubGroup[] = [];
    for (const pq of PIN_QUIZZES) {
      if (!section.landmarks.some(lm => lm.id === pq.landmarkId)) continue;
      const pa = answers.filter(a => a.phase === `phase1_pin_${pq.landmarkId}`);
      if (pa.length === 0) continue;

      const pinRows: AnswerRow[] = pq.questions.map(q => {
        const a = pa.find(r => r.question_id === q.id);
        const rawGiven = a?.answer_given ?? null;
        const formatted = formatAnswerGiven(rawGiven);
        const correctStr = PIN_CORRECT_ANSWERS[q.id] ?? '';
        let correct: boolean | null = null;
        if (correctStr !== '') {
          // Recompute from stored answer_given (more reliable than stored a.correct)
          if (q.type === 'multiselect') {
            const givenArr: string[] = rawGiven ? JSON.parse(rawGiven) : [];
            const correctArr = Array.isArray(q.answer) ? (q.answer as string[]) : [];
            correct = givenArr.length === correctArr.length && givenArr.every(x => correctArr.includes(x));
          } else {
            correct = rawGiven !== null && rawGiven.toLowerCase() === String(q.answer).toLowerCase();
          }
        }
        return {
          questionLabel: PIN_QUESTION_LABELS[q.id] ?? q.id,
          given: formatted,
          correct,
          correctAnswer: correctStr,
        };
      });

      const landmarkLabel = LANDMARK_LABELS[pq.landmarkId] ?? pq.landmarkId;
      subGroups.push({
        key: `phase1_pin_${pq.landmarkId}`,
        label: `${landmarkLabel} — Project Quiz`,
        rows: pinRows,
        score: scoreRows(pinRows),
      });
    }

    groups.push({ key: phaseKey, label: section.label, rows, score: scoreRows(rows), subGroups: subGroups.length > 0 ? subGroups : undefined });
  }

  const p2 = answers.filter(a => a.phase === 'phase2');
  if (p2.length > 0) {
    const rows: AnswerRow[] = p2.map(a => {
      const q = QUESTION_MAP[a.question_id];
      const hasCorrect = q?.answer !== '' && q?.answer !== undefined;
      return {
        questionLabel: q?.question ?? a.question_id,
        given: formatAnswerGiven(a.answer_given),
        correct: hasCorrect ? a.correct : null,
        correctAnswer: Array.isArray(q?.answer) ? (q.answer as string[]).join(', ') : (q?.answer ?? ''),
      };
    });
    groups.push({ key: 'phase2', label: 'Knowledge Quiz', rows, score: scoreRows(rows) });
  }

  return groups;
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScoreBar({ pct }: { pct: number }) {
  const color = pct >= PASS_THRESHOLD ? 'var(--tgl-lime)' : '#ef4444';
  return (
    <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden', width: 80 }}>
      <div style={{ width: `${Math.round(pct * 100)}%`, height: '100%', background: color, borderRadius: 99, transition: 'width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)' }} />
    </div>
  );
}

function ScoreBadge({ score, small }: { score: { correct: number; total: number }; small?: boolean }) {
  if (score.total === 0) return null;
  const pct = Math.round((score.correct / score.total) * 100);
  const passing = score.correct / score.total >= PASS_THRESHOLD;
  return (
    <span style={{
      fontSize: small ? 10 : 11,
      fontWeight: 700,
      fontFamily: 'var(--font-space)',
      color: passing ? 'var(--tgl-lime)' : '#ef4444',
      background: passing ? 'rgba(215,255,0,0.1)' : 'rgba(239,68,68,0.1)',
      border: `1px solid ${passing ? 'rgba(215,255,0,0.2)' : 'rgba(239,68,68,0.2)'}`,
      borderRadius: 99,
      padding: small ? '1px 7px' : '2px 9px',
      whiteSpace: 'nowrap',
    }}>
      {score.correct}/{score.total} · {pct}%
    </span>
  );
}

function AnswerRowItem({ row }: { row: AnswerRow }) {
  const isGrey = row.correct === null;
  return (
    <div
      className="px-5 py-3 flex items-start gap-3"
      style={{ borderTop: '1px solid rgba(255,255,255,0.04)', background: row.correct === false ? 'rgba(239,68,68,0.025)' : 'transparent' }}
    >
      <div
        className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold mt-0.5"
        style={{
          background: isGrey ? 'rgba(255,255,255,0.06)' : row.correct ? 'rgba(215,255,0,0.15)' : 'rgba(239,68,68,0.15)',
          color: isGrey ? 'rgba(255,255,255,0.25)' : row.correct ? 'var(--tgl-lime)' : '#ef4444',
          fontFamily: 'var(--font-space)',
        }}
      >
        {isGrey ? '—' : row.correct ? '✓' : '✗'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium" style={{ color: 'var(--tgl-white)', fontFamily: 'var(--font-montserrat)' }}>
          {row.questionLabel}
        </div>
        <div className="text-xs mt-1" style={{ fontFamily: 'var(--font-montserrat)', color: (!isGrey && row.correct) ? 'rgba(215,255,0,0.6)' : 'rgba(255,255,255,0.4)' }}>
          You answered: <span className="font-semibold" style={{ color: isGrey ? 'rgba(255,255,255,0.4)' : row.correct ? 'var(--tgl-lime)' : '#ef4444' }}>{row.given ?? '—'}</span>
        </div>
        {!isGrey && !row.correct && row.correctAnswer && (
          <div className="text-xs mt-0.5" style={{ fontFamily: 'var(--font-montserrat)', color: 'rgba(255,255,255,0.4)' }}>
            Correct answer: <span className="font-semibold" style={{ color: 'var(--tgl-lime)' }}>{row.correctAnswer}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ResultsPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [session, setSession] = useState<Session | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [collapsedSubs, setCollapsedSubs] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    getSessionResults(sessionId)
      .then(({ session, answers }) => { setSession(session); setAnswers(answers); })
      .catch(() => setError('Could not load results. Please try again.'))
      .finally(() => setLoading(false));
  }, [sessionId]);

  function toggleGroup(key: string) {
    setCollapsed(prev => { const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next; });
  }
  function toggleSub(key: string) {
    setCollapsedSubs(prev => { const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next; });
  }

  async function handleDownload() {
    if (!session) return;
    setDownloading(true);
    try {
      const { generateReportDocx } = await import('@/lib/utils/generate-report');
      const blob = await generateReportDocx({ session, scores, answerGroups });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `TGL-Report-${session.name.replace(/\s+/g, '-')}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

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
  const answerGroups = buildAnswerReview(answers);
  const overall = computeOverall(scores);
  const { best, worst } = getBestWorst(scores);
  const weakSections = scores.filter((s) => s.pct < PASS_THRESHOLD);
  const completedAt = session.completed_at
    ? new Date(session.completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'In progress';

  return (
    <main className="min-h-screen flex flex-col" style={{ background: 'var(--tgl-black)' }}>
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between shrink-0" style={{ borderBottom: '1px solid rgba(215,255,0,0.12)' }}>
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
        <div className="rounded-2xl p-6 mb-8" style={{ background: '#0d0d0d', border: '1px solid rgba(215,255,0,0.12)' }}>
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
            style={{ fontFamily: 'var(--font-space)', color: overall >= PASS_THRESHOLD ? 'var(--tgl-lime)' : '#ef4444', letterSpacing: '-0.04em', lineHeight: 1 }}
          >
            {Math.round(overall * 100)}%
          </div>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-montserrat)' }}>
            {overall >= 0.9 ? 'Outstanding! You know the North Coast inside out.' :
             overall >= PASS_THRESHOLD ? 'Good work. A few areas to polish.' :
             'Needs improvement. Review the sections below.'}
          </p>
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

        {/* Section breakdown */}
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
                <div key={s.key} className="flex items-center gap-4 px-5 py-4" style={{ borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                  <div className="flex-1">
                    <div className="text-sm font-bold" style={{ color: 'var(--tgl-white)', fontFamily: 'var(--font-space)' }}>{s.label}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-montserrat)' }}>{s.correct}/{s.total} correct</div>
                  </div>
                  <ScoreBar pct={s.pct} />
                  <div className="text-sm font-bold w-12 text-right" style={{ color: passing ? 'var(--tgl-lime)' : '#ef4444', fontFamily: 'var(--font-space)' }}>
                    {Math.round(s.pct * 100)}%
                  </div>
                  <div className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: passing ? 'rgba(215,255,0,0.1)' : 'rgba(239,68,68,0.1)', color: passing ? 'var(--tgl-lime)' : '#ef4444', border: `1px solid ${passing ? 'rgba(215,255,0,0.2)' : 'rgba(239,68,68,0.2)'}`, fontFamily: 'var(--font-space)', whiteSpace: 'nowrap' }}>
                    {passing ? '✓ Pass' : '⚠ Review'}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Answer review — collapsible section cards */}
        {answerGroups.length > 0 && (
          <div className="mb-8">
            <div className="px-1 pb-4">
              <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(215,255,0,0.6)', fontFamily: 'var(--font-space)' }}>
                Answer Review
              </h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {answerGroups.map((group) => {
                const isCollapsed = collapsed.has(group.key);
                return (
                  <div
                    key={group.key}
                    className="rounded-2xl overflow-hidden"
                    style={{ background: '#0d0d0d', border: '1px solid rgba(215,255,0,0.1)' }}
                  >
                    {/* Group header */}
                    <button
                      onClick={() => toggleGroup(group.key)}
                      className="w-full px-5 py-3 flex items-center justify-between"
                      style={{ background: 'rgba(255,255,255,0.025)', cursor: 'pointer', border: 'none', outline: 'none' }}
                    >
                      <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-space)' }}>
                        {group.label}
                      </span>
                      <div className="flex items-center gap-3">
                        <ScoreBadge score={group.score} />
                        <span
                          style={{
                            color: 'rgba(255,255,255,0.3)',
                            fontSize: 14,
                            lineHeight: 1,
                            display: 'inline-block',
                            transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s ease',
                          }}
                        >
                          ▾
                        </span>
                      </div>
                    </button>

                    {/* Collapsible content */}
                    {!isCollapsed && (
                      <>
                        {group.rows.map((row, ri) => (
                          <AnswerRowItem key={ri} row={row} />
                        ))}

                        {/* Pin quiz sub-groups */}
                        {group.subGroups?.map((sub) => {
                          const isSubCollapsed = collapsedSubs.has(sub.key);
                          return (
                            <div
                              key={sub.key}
                              style={{
                                margin: '8px 12px 12px 20px',
                                borderLeft: '2px solid rgba(215,255,0,0.2)',
                                borderRadius: '0 8px 8px 0',
                                overflow: 'hidden',
                                background: 'rgba(215,255,0,0.02)',
                              }}
                            >
                              <button
                                onClick={() => toggleSub(sub.key)}
                                className="w-full px-4 py-2.5 flex items-center justify-between"
                                style={{ background: 'rgba(215,255,0,0.04)', cursor: 'pointer', border: 'none', outline: 'none' }}
                              >
                                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(215,255,0,0.5)', fontFamily: 'var(--font-space)' }}>
                                  {sub.label}
                                </span>
                                <div className="flex items-center gap-2">
                                  <ScoreBadge score={sub.score} small />
                                  <span
                                    style={{
                                      color: 'rgba(255,255,255,0.25)',
                                      fontSize: 12,
                                      lineHeight: 1,
                                      display: 'inline-block',
                                      transform: isSubCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                                      transition: 'transform 0.2s ease',
                                    }}
                                  >
                                    ▾
                                  </span>
                                </div>
                              </button>
                              {!isSubCollapsed && sub.rows.map((row, ri) => (
                                <AnswerRowItem key={ri} row={row} />
                              ))}
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Improvement tips */}
        {weakSections.length > 0 && (
          <div className="rounded-2xl overflow-hidden mb-8" style={{ border: '1px solid rgba(239,68,68,0.15)' }}>
            <div className="px-5 py-3" style={{ background: 'rgba(239,68,68,0.05)', borderBottom: '1px solid rgba(239,68,68,0.1)' }}>
              <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(239,68,68,0.8)', fontFamily: 'var(--font-space)' }}>
                Improvement Areas
              </h2>
            </div>
            {weakSections.map((s, i) => (
              <div key={s.key} className="px-5 py-4 flex gap-4 items-start" style={{ borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                <div className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold mt-0.5" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', fontFamily: 'var(--font-space)' }}>!</div>
                <div>
                  <div className="text-sm font-bold mb-1" style={{ color: 'var(--tgl-white)', fontFamily: 'var(--font-space)' }}>{s.label} — {Math.round(s.pct * 100)}%</div>
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.55)', fontFamily: 'var(--font-montserrat)', lineHeight: 1.6 }}>{s.tip}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <a
            href="/"
            className="flex-1 py-3 rounded-xl text-sm font-bold text-center transition-all duration-150"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.12)', fontFamily: 'var(--font-space)' }}
          >
            Retake Assessment
          </a>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex-1 py-3 rounded-xl text-sm font-bold transition-all duration-150 active:scale-95"
            style={{
              background: downloading ? 'rgba(215,255,0,0.06)' : 'var(--tgl-lime)',
              color: downloading ? 'rgba(215,255,0,0.4)' : '#000',
              border: downloading ? '1px solid rgba(215,255,0,0.2)' : 'none',
              boxShadow: downloading ? 'none' : '0 0 20px rgba(215,255,0,0.3)',
              fontFamily: 'var(--font-space)',
              cursor: downloading ? 'not-allowed' : 'pointer',
            }}
          >
            {downloading ? 'Generating…' : '⬇ Download Report'}
          </button>
        </div>

      </div>
    </main>
  );
}
