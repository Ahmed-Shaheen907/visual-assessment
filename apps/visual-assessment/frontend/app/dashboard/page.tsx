'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  getUserProfile,
  getAgentSessions,
  createSession,
  type Profile,
  type Session,
  type Answer,
} from '@/lib/supabase-helpers';
import { SECTIONS } from '@/lib/data/landmarks';

const PASS_THRESHOLD = 0.7;

const COLUMNS = [
  { key: 'phase0', label: 'Overview' },
  ...SECTIONS.map((s) => ({ key: `phase1_${s.id}`, label: s.label.split(' ')[0] })),
  { key: 'phase2', label: 'Quiz' },
];

function computeOverall(answers: Answer[]) {
  const totalCorrect = answers.filter((a) => a.correct).length;
  return answers.length > 0 ? totalCorrect / answers.length : 0;
}

function computePhaseScore(answers: Answer[], phaseKey: string) {
  const sa = answers.filter((a) => a.phase === phaseKey);
  if (!sa.length) return null;
  const correct = sa.filter((a) => a.correct).length;
  return { correct, total: sa.length, pct: correct / sa.length };
}

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [rows, setRows] = useState<{ session: Session; answers: Answer[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.replace('/auth'); return; }
      setUserId(user.id);
      setUserEmail(user.email ?? null);

      const [prof, sessions] = await Promise.all([
        getUserProfile(user.id),
        getAgentSessions(user.id),
      ]);

      if (prof?.is_manager) { router.replace('/manager'); return; }
      setProfile(prof);
      setRows(sessions);
      setLoading(false);
    });
  }, [router]);

  const handleStartAssessment = useCallback(async () => {
    if (!userId || !profile || !userEmail) return;
    setStarting(true);
    try {
      const sessionId = await createSession(profile.name, userEmail, userId);
      localStorage.setItem('va_session_id', sessionId);
      localStorage.setItem('va_agent_name', profile.name);
      localStorage.setItem('va_user_email', userEmail);
      router.push('/game');
    } catch {
      setStarting(false);
    }
  }, [userId, profile, userEmail, router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace('/auth');
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: 'var(--tgl-black)' }}>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-montserrat)' }}>Loading…</p>
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
            <h1 className="text-lg font-bold tracking-tight leading-none" style={{ fontFamily: 'var(--font-space)', color: 'var(--tgl-white)' }}>
              {profile?.name ?? 'My Dashboard'}
            </h1>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-montserrat)' }}>
              North Coast Assessment
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleStartAssessment}
            disabled={starting}
            className="px-5 py-2 rounded-full text-sm font-bold transition-all duration-150 active:scale-95"
            style={{
              fontFamily: 'var(--font-space)',
              background: starting ? 'rgba(215,255,0,0.08)' : 'var(--tgl-lime)',
              color: starting ? 'rgba(215,255,0,0.3)' : '#000',
              border: starting ? '1px solid rgba(215,255,0,0.15)' : 'none',
              boxShadow: starting ? 'none' : 'var(--glow-lime-sm)',
              cursor: starting ? 'not-allowed' : 'pointer',
            }}
          >
            {starting ? 'Starting…' : '+ New Assessment'}
          </button>
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-full text-xs font-bold transition-opacity hover:opacity-60"
            style={{
              fontFamily: 'var(--font-space)',
              color: 'rgba(255,255,255,0.4)',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'transparent',
              cursor: 'pointer',
            }}
          >
            Log Out
          </button>
        </div>
      </header>

      <div className="flex-1 px-6 py-8">
        {rows.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
              style={{ background: 'rgba(215,255,0,0.06)', border: '1px solid rgba(215,255,0,0.15)' }}
            >
              <span style={{ fontSize: 28 }}>🗺️</span>
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ fontFamily: 'var(--font-space)', color: 'var(--tgl-white)' }}>
              No assessments yet
            </h2>
            <p className="text-sm mb-8" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-montserrat)', maxWidth: 280 }}>
              Start your first North Coast assessment to test your knowledge and track your progress.
            </p>
            <button
              onClick={handleStartAssessment}
              disabled={starting}
              className="px-8 py-4 rounded-xl text-sm font-black uppercase tracking-widest transition-all duration-150 active:scale-95"
              style={{
                fontFamily: 'var(--font-space)',
                background: starting ? 'rgba(215,255,0,0.08)' : 'var(--tgl-lime)',
                color: starting ? 'rgba(215,255,0,0.3)' : '#000',
                boxShadow: starting ? 'none' : 'var(--glow-lime)',
                border: 'none',
                cursor: starting ? 'not-allowed' : 'pointer',
                letterSpacing: '0.08em',
              }}
            >
              {starting ? 'Starting…' : 'Begin Assessment →'}
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-bold" style={{ fontFamily: 'var(--font-space)', color: 'rgba(255,255,255,0.6)' }}>
                Assessment History
              </h2>
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-montserrat)' }}>
                {rows.length} completed
              </span>
            </div>

            <div className="rounded-2xl overflow-hidden overflow-x-auto" style={{ border: '1px solid rgba(215,255,0,0.1)', minWidth: 700 }}>
              <table className="w-full border-collapse">
                <thead>
                  <tr style={{ background: '#0d0d0d', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <th className="px-5 py-3 text-left">
                      <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(215,255,0,0.6)', fontFamily: 'var(--font-space)' }}>Date</span>
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
                  {rows.map(({ session, answers }, i) => {
                    const overall = computeOverall(answers);
                    const passing = overall >= PASS_THRESHOLD;
                    const date = session.completed_at
                      ? new Date(session.completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
                      : '—';

                    return (
                      <tr
                        key={session.id}
                        style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}
                      >
                        <td className="px-5 py-3 text-sm" style={{ color: 'rgba(255,255,255,0.55)', fontFamily: 'var(--font-montserrat)' }}>
                          {date}
                        </td>
                        {COLUMNS.map((col) => {
                          const score = computePhaseScore(answers, col.key);
                          if (!score) {
                            return (
                              <td key={col.key} className="px-3 py-3 text-center" style={{ color: 'rgba(255,255,255,0.15)', fontSize: 12, fontFamily: 'var(--font-montserrat)' }}>—</td>
                            );
                          }
                          const ok = score.pct >= PASS_THRESHOLD;
                          return (
                            <td key={col.key} className="px-3 py-3 text-center">
                              <span
                                className="text-xs font-bold px-2 py-0.5 rounded-full"
                                style={{
                                  color: ok ? 'var(--tgl-lime)' : '#ef4444',
                                  background: ok ? 'rgba(215,255,0,0.08)' : 'rgba(239,68,68,0.08)',
                                  fontFamily: 'var(--font-space)',
                                }}
                              >
                                {Math.round(score.pct * 100)}%
                              </span>
                            </td>
                          );
                        })}
                        <td className="px-3 py-3 text-center">
                          <span
                            className="text-sm font-black px-2 py-0.5 rounded-full"
                            style={{
                              color: passing ? 'var(--tgl-lime)' : '#ef4444',
                              fontFamily: 'var(--font-space)',
                            }}
                          >
                            {Math.round(overall * 100)}%
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <a
                            href={`/results/${session.id}`}
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
          </>
        )}
      </div>
    </main>
  );
}
