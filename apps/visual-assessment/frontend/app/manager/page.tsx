'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { getAllSessions } from '@/lib/supabase-helpers';
import type { Session, Answer } from '@/lib/supabase-helpers';
import { SECTIONS } from '@/lib/data/landmarks';

const PASS_THRESHOLD = 0.7;

interface AgentRow {
  session: Session;
  scores: Record<string, { correct: number; total: number; pct: number }>;
  overall: number;
}

const COLUMNS = [
  { key: 'phase0', label: 'Overview' },
  ...SECTIONS.map((s) => ({ key: `phase1_${s.id}`, label: s.label.split(' ')[0] })),
  { key: 'phase2', label: 'Quiz' },
];

function computeAgentRow(session: Session, answers: Answer[]): AgentRow {
  const scores: Record<string, { correct: number; total: number; pct: number }> = {};

  for (const col of COLUMNS) {
    const sa = answers.filter((a) => a.phase === col.key);
    if (sa.length > 0) {
      const correct = sa.filter((a) => a.correct).length;
      scores[col.key] = { correct, total: sa.length, pct: correct / sa.length };
    }
  }

  const totalCorrect = Object.values(scores).reduce((s, x) => s + x.correct, 0);
  const totalQ = Object.values(scores).reduce((s, x) => s + x.total, 0);
  const overall = totalQ > 0 ? totalCorrect / totalQ : 0;

  return { session, scores, overall };
}

function ScoreCell({ score }: { score: { correct: number; total: number; pct: number } | undefined }) {
  if (!score) {
    return <td className="px-3 py-3 text-center" style={{ color: 'rgba(255,255,255,0.15)', fontSize: 12, fontFamily: 'var(--font-montserrat)' }}>—</td>;
  }
  const passing = score.pct >= PASS_THRESHOLD;
  return (
    <td className="px-3 py-3 text-center">
      <span
        className="text-xs font-bold px-2 py-0.5 rounded-full"
        style={{
          color: passing ? 'var(--tgl-lime)' : '#ef4444',
          background: passing ? 'rgba(215,255,0,0.08)' : 'rgba(239,68,68,0.08)',
          fontFamily: 'var(--font-space)',
        }}
      >
        {Math.round(score.pct * 100)}%
      </span>
    </td>
  );
}

export default function ManagerPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rows, setRows] = useState<AgentRow[]>([]);

  useEffect(() => {
    getAllSessions()
      .then((all) => {
        setRows(all.map(({ session, answers }) => computeAgentRow(session, answers)));
      })
      .catch(() => setError('Failed to load data.'))
      .finally(() => setLoading(false));
  }, []);

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
              Manager Dashboard
            </h1>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-montserrat)' }}>
              All agent assessments · North Coast
            </p>
          </div>
        </div>
        {!loading && (
          <div
            className="px-4 py-1.5 rounded-full text-sm font-bold"
            style={{ border: '1px solid rgba(215,255,0,0.3)', color: 'var(--tgl-lime)', background: 'rgba(215,255,0,0.06)', fontFamily: 'var(--font-space)' }}
          >
            {rows.length} Agent{rows.length !== 1 ? 's' : ''}
          </div>
        )}
      </header>

      <div className="flex-1 px-6 py-8 overflow-x-auto">
        {loading && (
          <div className="flex items-center justify-center py-20 text-sm" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-montserrat)' }}>
            Loading…
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center py-20 text-sm" style={{ color: '#ef4444', fontFamily: 'var(--font-montserrat)' }}>
            {error}
          </div>
        )}

        {!loading && !error && rows.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-montserrat)' }}>
              No completed assessments yet.
            </p>
          </div>
        )}

        {!loading && !error && rows.length > 0 && (
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(215,255,0,0.1)', minWidth: 900 }}>
            <table className="w-full border-collapse">
              <thead>
                <tr style={{ background: '#0d0d0d', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <th className="px-5 py-3 text-left">
                    <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(215,255,0,0.6)', fontFamily: 'var(--font-space)' }}>Agent</span>
                  </th>
                  <th className="px-3 py-3 text-center">
                    <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-space)' }}>Date</span>
                  </th>
                  {COLUMNS.map((col) => (
                    <th key={col.key} className="px-3 py-3 text-center">
                      <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-space)' }}>
                        {col.label}
                      </span>
                    </th>
                  ))}
                  <th className="px-3 py-3 text-center">
                    <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(215,255,0,0.6)', fontFamily: 'var(--font-space)' }}>Total</span>
                  </th>
                  <th className="px-3 py-3 text-center">
                    <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-space)' }}>Report</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const passing = row.overall >= PASS_THRESHOLD;
                  const date = row.session.completed_at
                    ? new Date(row.session.completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                    : '—';
                  return (
                    <tr
                      key={row.session.id}
                      style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}
                    >
                      <td className="px-5 py-3">
                        <div className="text-sm font-bold" style={{ color: 'var(--tgl-white)', fontFamily: 'var(--font-space)' }}>{row.session.name}</div>
                        <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-montserrat)' }}>{row.session.email}</div>
                      </td>
                      <td className="px-3 py-3 text-center text-xs" style={{ color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-montserrat)' }}>
                        {date}
                      </td>
                      {COLUMNS.map((col) => (
                        <ScoreCell key={col.key} score={row.scores[col.key]} />
                      ))}
                      <td className="px-3 py-3 text-center">
                        <span
                          className="text-sm font-black px-2 py-0.5 rounded-full"
                          style={{
                            color: passing ? 'var(--tgl-lime)' : '#ef4444',
                            fontFamily: 'var(--font-space)',
                          }}
                        >
                          {Math.round(row.overall * 100)}%
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <a
                          href={`/results/${row.session.id}`}
                          className="text-xs font-bold transition-opacity duration-150 hover:opacity-60"
                          style={{ color: 'var(--tgl-lime)', fontFamily: 'var(--font-space)', textDecoration: 'none' }}
                        >
                          View →
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
