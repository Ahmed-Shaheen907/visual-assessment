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
  const [profile, setProfile]   = useState<Profile | null>(null);
  const [rows, setRows]         = useState<{ session: Session; answers: Answer[] }[]>([]);
  const [loading, setLoading]   = useState(true);
  const [starting, setStarting] = useState(false);
  const [userId, setUserId]     = useState<string | null>(null);
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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            border: '2px solid rgba(215,255,0,0.1)',
            borderTopColor: 'var(--tgl-lime)',
            animation: 'spin 0.8s linear infinite',
            boxShadow: '0 0 14px rgba(215,255,0,0.2)',
          }} />
          <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12, fontFamily: 'var(--font-montserrat)' }}>Loading…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col" style={{ background: 'var(--tgl-black)' }}>

      {/* ── Header ── */}
      <header
        className="px-6 py-4 flex items-center justify-between shrink-0"
        style={{
          borderBottom: '1px solid rgba(215,255,0,0.1)',
          boxShadow: '0 1px 0 rgba(215,255,0,0.05), 0 4px 24px rgba(0,0,0,0.4)',
          background: 'rgba(0,0,0,0.96)',
          backdropFilter: 'blur(20px)',
          position: 'sticky',
          top: 0,
          zIndex: 30,
        }}
      >
        <div className="flex items-center gap-3">
          <Image src="/tgl-logo.png" alt="TGL" width={36} height={36} className="object-contain" />
          <div>
            <h1
              className="text-lg font-bold leading-none"
              style={{
                fontFamily: 'var(--font-space)',
                color: 'var(--tgl-white)',
                letterSpacing: '-0.02em',
              }}
            >
              {profile?.name ?? 'My Dashboard'}
            </h1>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.38)', fontFamily: 'var(--font-montserrat)' }}>
              North Coast Assessment
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleStartAssessment}
            disabled={starting}
            className="px-5 py-2 rounded-full text-sm font-bold active:scale-95"
            style={{
              fontFamily: 'var(--font-space)',
              background: starting ? 'rgba(215,255,0,0.08)' : 'var(--tgl-lime)',
              color: starting ? 'rgba(215,255,0,0.3)' : '#000',
              border: starting ? '1px solid rgba(215,255,0,0.12)' : 'none',
              boxShadow: starting ? 'none' : '0 0 16px rgba(215,255,0,0.35), 0 0 40px rgba(215,255,0,0.1)',
              cursor: starting ? 'not-allowed' : 'pointer',
              transition: 'box-shadow 150ms ease',
              letterSpacing: '-0.01em',
            }}
            onMouseEnter={e => {
              if (!starting) (e.currentTarget as HTMLElement).style.boxShadow = '0 0 24px rgba(215,255,0,0.55), 0 0 60px rgba(215,255,0,0.16)';
            }}
            onMouseLeave={e => {
              if (!starting) (e.currentTarget as HTMLElement).style.boxShadow = '0 0 16px rgba(215,255,0,0.35), 0 0 40px rgba(215,255,0,0.1)';
            }}
          >
            {starting ? 'Starting…' : '+ New Assessment'}
          </button>
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-full text-xs font-bold"
            style={{
              fontFamily: 'var(--font-space)',
              color: 'rgba(255,255,255,0.35)',
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'transparent',
              cursor: 'pointer',
              transition: 'color 150ms, border-color 150ms',
              letterSpacing: '-0.01em',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.7)';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.18)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.35)';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)';
            }}
          >
            Log Out
          </button>
        </div>
      </header>

      <div className="flex-1 px-6 py-10">
        {rows.length === 0 ? (
          /* ── Empty state ── */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            {/* Glow + icon */}
            <div style={{ position: 'relative', marginBottom: 28 }}>
              <div style={{
                position: 'absolute',
                inset: -40,
                background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(215,255,0,0.1) 0%, transparent 70%)',
                pointerEvents: 'none',
              }} />
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 22,
                  background: 'rgba(215,255,0,0.06)',
                  border: '1px solid rgba(215,255,0,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  boxShadow: '0 0 40px rgba(215,255,0,0.08), inset 0 1px 0 rgba(215,255,0,0.1)',
                }}
              >
                <span style={{ fontSize: 32 }}>🗺️</span>
              </div>
            </div>

            <h2
              className="text-2xl font-bold mb-3"
              style={{
                fontFamily: 'var(--font-space)',
                color: 'var(--tgl-white)',
                letterSpacing: '-0.03em',
                lineHeight: 1.1,
              }}
            >
              No assessments yet
            </h2>
            <p
              className="text-sm mb-10"
              style={{
                color: 'rgba(255,255,255,0.38)',
                fontFamily: 'var(--font-montserrat)',
                maxWidth: 300,
                lineHeight: 1.7,
              }}
            >
              Start your first North Coast assessment to test your knowledge and track your progress over time.
            </p>
            <button
              onClick={handleStartAssessment}
              disabled={starting}
              className="px-10 py-4 rounded-2xl text-sm font-black uppercase tracking-widest active:scale-95"
              style={{
                fontFamily: 'var(--font-space)',
                background: starting ? 'rgba(215,255,0,0.08)' : 'var(--tgl-lime)',
                color: starting ? 'rgba(215,255,0,0.3)' : '#000',
                boxShadow: starting ? 'none' : '0 0 24px rgba(215,255,0,0.45), 0 0 60px rgba(215,255,0,0.15)',
                border: 'none',
                cursor: starting ? 'not-allowed' : 'pointer',
                letterSpacing: '0.08em',
                transition: 'box-shadow 150ms ease, transform 150ms ease',
              }}
              onMouseEnter={e => {
                if (!starting) {
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 0 36px rgba(215,255,0,0.65), 0 0 80px rgba(215,255,0,0.2)';
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={e => {
                if (!starting) {
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 0 24px rgba(215,255,0,0.45), 0 0 60px rgba(215,255,0,0.15)';
                  (e.currentTarget as HTMLElement).style.transform = '';
                }
              }}
            >
              {starting ? 'Starting…' : 'Begin Assessment →'}
            </button>
          </div>
        ) : (
          <>
            {/* ── History header ── */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2
                  className="text-lg font-bold"
                  style={{
                    fontFamily: 'var(--font-space)',
                    color: 'rgba(255,255,255,0.9)',
                    letterSpacing: '-0.02em',
                  }}
                >
                  Assessment History
                </h2>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-montserrat)' }}>
                  {rows.length} {rows.length === 1 ? 'session' : 'sessions'} completed
                </p>
              </div>
              <button
                onClick={handleStartAssessment}
                disabled={starting}
                className="px-4 py-2 rounded-xl text-xs font-bold active:scale-95"
                style={{
                  fontFamily: 'var(--font-space)',
                  background: starting ? 'rgba(215,255,0,0.06)' : 'rgba(215,255,0,0.1)',
                  color: starting ? 'rgba(215,255,0,0.3)' : 'var(--tgl-lime)',
                  border: '1px solid rgba(215,255,0,0.2)',
                  cursor: starting ? 'not-allowed' : 'pointer',
                  boxShadow: starting ? 'none' : '0 0 10px rgba(215,255,0,0.12)',
                  letterSpacing: '-0.01em',
                  transition: 'all 150ms ease',
                }}
                onMouseEnter={e => {
                  if (!starting) (e.currentTarget as HTMLElement).style.background = 'rgba(215,255,0,0.16)';
                }}
                onMouseLeave={e => {
                  if (!starting) (e.currentTarget as HTMLElement).style.background = 'rgba(215,255,0,0.1)';
                }}
              >
                {starting ? 'Starting…' : '+ New Assessment'}
              </button>
            </div>

            {/* ── Table ── */}
            <div
              className="rounded-2xl overflow-hidden overflow-x-auto"
              style={{
                border: '1px solid rgba(215,255,0,0.1)',
                boxShadow: '0 0 40px rgba(215,255,0,0.04)',
                minWidth: 700,
              }}
            >
              <table className="w-full border-collapse">
                <thead>
                  <tr
                    style={{
                      background: 'linear-gradient(180deg, #111111 0%, #0d0d0d 100%)',
                      borderBottom: '1px solid rgba(215,255,0,0.08)',
                    }}
                  >
                    <th className="px-5 py-3.5 text-left">
                      <span
                        className="text-xs font-bold uppercase tracking-widest"
                        style={{ color: 'rgba(215,255,0,0.5)', fontFamily: 'var(--font-space)' }}
                      >
                        Date
                      </span>
                    </th>
                    {COLUMNS.map((col) => (
                      <th key={col.key} className="px-3 py-3.5 text-center">
                        <span
                          className="text-xs font-bold uppercase tracking-widest"
                          style={{ color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-space)' }}
                        >
                          {col.label}
                        </span>
                      </th>
                    ))}
                    <th className="px-3 py-3.5 text-center">
                      <span
                        className="text-xs font-bold uppercase tracking-widest"
                        style={{ color: 'rgba(215,255,0,0.5)', fontFamily: 'var(--font-space)' }}
                      >
                        Total
                      </span>
                    </th>
                    <th className="px-3 py-3.5 text-center">
                      <span
                        className="text-xs font-bold uppercase tracking-widest"
                        style={{ color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-space)' }}
                      >
                        Report
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ session, answers }, i) => {
                    const overall = computeOverall(answers);
                    const passing = overall >= PASS_THRESHOLD;
                    const date    = session.completed_at
                      ? new Date(session.completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
                      : '—';

                    return (
                      <tr
                        key={session.id}
                        style={{
                          borderTop: '1px solid rgba(255,255,255,0.04)',
                          background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.012)',
                          transition: 'background 150ms ease',
                          cursor: 'default',
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLElement).style.background = 'rgba(215,255,0,0.025)';
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLElement).style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.012)';
                        }}
                      >
                        <td
                          className="px-5 py-3.5 text-sm"
                          style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-montserrat)' }}
                        >
                          {date}
                        </td>
                        {COLUMNS.map((col) => {
                          const score = computePhaseScore(answers, col.key);
                          if (!score) {
                            return (
                              <td
                                key={col.key}
                                className="px-3 py-3.5 text-center"
                                style={{ color: 'rgba(255,255,255,0.12)', fontSize: 12, fontFamily: 'var(--font-montserrat)' }}
                              >
                                —
                              </td>
                            );
                          }
                          const ok = score.pct >= PASS_THRESHOLD;
                          return (
                            <td key={col.key} className="px-3 py-3.5 text-center">
                              <span
                                className="text-xs font-bold px-2.5 py-1 rounded-full"
                                style={{
                                  color: ok ? 'var(--tgl-lime)' : '#ef4444',
                                  background: ok ? 'rgba(215,255,0,0.08)' : 'rgba(239,68,68,0.08)',
                                  border: `1px solid ${ok ? 'rgba(215,255,0,0.15)' : 'rgba(239,68,68,0.15)'}`,
                                  fontFamily: 'var(--font-space)',
                                  boxShadow: ok ? '0 0 8px rgba(215,255,0,0.1)' : 'none',
                                }}
                              >
                                {Math.round(score.pct * 100)}%
                              </span>
                            </td>
                          );
                        })}
                        <td className="px-3 py-3.5 text-center">
                          <span
                            className="text-sm font-black"
                            style={{
                              color: passing ? 'var(--tgl-lime)' : '#ef4444',
                              fontFamily: 'var(--font-space)',
                              textShadow: passing ? '0 0 10px rgba(215,255,0,0.35)' : '0 0 10px rgba(239,68,68,0.3)',
                              letterSpacing: '-0.02em',
                            }}
                          >
                            {Math.round(overall * 100)}%
                          </span>
                        </td>
                        <td className="px-3 py-3.5 text-center">
                          <a
                            href={`/results/${session.id}`}
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              fontFamily: 'var(--font-space)',
                              color: 'rgba(215,255,0,0.6)',
                              textDecoration: 'none',
                              background: 'rgba(215,255,0,0.06)',
                              border: '1px solid rgba(215,255,0,0.15)',
                              borderRadius: 8,
                              padding: '4px 10px',
                              display: 'inline-block',
                              transition: 'all 150ms ease',
                            }}
                            onMouseEnter={e => {
                              (e.currentTarget as HTMLElement).style.background = 'rgba(215,255,0,0.12)';
                              (e.currentTarget as HTMLElement).style.color = 'var(--tgl-lime)';
                            }}
                            onMouseLeave={e => {
                              (e.currentTarget as HTMLElement).style.background = 'rgba(215,255,0,0.06)';
                              (e.currentTarget as HTMLElement).style.color = 'rgba(215,255,0,0.6)';
                            }}
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
