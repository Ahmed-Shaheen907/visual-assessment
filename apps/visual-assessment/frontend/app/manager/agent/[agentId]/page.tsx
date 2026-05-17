'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getManagerManagedAgents, getAgentSessions } from '@/lib/supabase-helpers';
import type { Session } from '@/lib/supabase-helpers';
import { computeScores, computeOverall, averageScores, PASS_THRESHOLD } from '@/lib/utils/scores';
import type { SectionScore } from '@/lib/utils/scores';

// ─── Section Score Card ───────────────────────────────────────────────────────

function SectionCard({ score }: { score: SectionScore }) {
  const pass = score.pct >= PASS_THRESHOLD;
  const pct = Math.round(score.pct * 100);
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-3"
      style={{
        background: pass ? 'rgba(215,255,0,0.04)' : 'rgba(239,68,68,0.04)',
        border: `1px solid ${pass ? 'rgba(215,255,0,0.15)' : 'rgba(239,68,68,0.15)'}`,
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold leading-tight" style={{ color: 'var(--tgl-white)', fontFamily: 'var(--font-space)' }}>
          {score.label}
        </span>
        <span className="text-sm font-black shrink-0" style={{ color: pass ? 'var(--tgl-lime)' : '#f87171', fontFamily: 'var(--font-space)' }}>
          {pct}%
        </span>
      </div>
      <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: pass ? 'var(--tgl-lime)' : '#ef4444',
            borderRadius: 99,
            transition: 'width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        />
      </div>
      <div className="text-xs" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-montserrat)' }}>
        {score.correct}/{score.total} correct
      </div>
    </div>
  );
}

// ─── Session Row ──────────────────────────────────────────────────────────────

function SessionRow({ session, scores, onClick }: { session: Session; scores: SectionScore[]; onClick: () => void }) {
  const overall = computeOverall(scores);
  const pass = overall >= PASS_THRESHOLD;
  const date = session.completed_at
    ? new Date(session.completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';
  const totalCorrect = scores.reduce((s, x) => s + x.correct, 0);
  const totalQ = scores.reduce((s, x) => s + x.total, 0);

  return (
    <button
      onClick={onClick}
      className="w-full px-5 py-4 flex items-center gap-4 text-left"
      style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: 'transparent', cursor: 'pointer', outline: 'none' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      <div className="flex-1">
        <div className="text-sm font-semibold" style={{ color: 'var(--tgl-white)', fontFamily: 'var(--font-montserrat)' }}>
          {date}
        </div>
        <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-montserrat)' }}>
          {totalCorrect}/{totalQ} correct
        </div>
      </div>
      <div className="text-sm font-black" style={{ color: pass ? 'var(--tgl-lime)' : '#f87171', fontFamily: 'var(--font-space)' }}>
        {Math.round(overall * 100)}%
      </div>
      <div
        className="text-xs px-2.5 py-1 rounded-full font-bold"
        style={{
          background: pass ? 'rgba(215,255,0,0.1)' : 'rgba(239,68,68,0.1)',
          color: pass ? 'var(--tgl-lime)' : '#f87171',
          border: `1px solid ${pass ? 'rgba(215,255,0,0.2)' : 'rgba(239,68,68,0.2)'}`,
          fontFamily: 'var(--font-space)',
        }}
      >
        {pass ? '✓ Pass' : '⚠ Review'}
      </div>
      <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>›</span>
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ManagerAgentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const agentId = params.agentId as string;

  const [agentName, setAgentName] = useState('');
  const [agentEmail, setAgentEmail] = useState('');
  const [sessions, setSessions] = useState<{ session: Session; scores: SectionScore[] }[]>([]);
  const [avgScores, setAvgScores] = useState<SectionScore[]>([]);
  const [overall, setOverall] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/auth'); return; }

      const { data: profile } = await supabase
        .from('va_profiles')
        .select('is_manager')
        .eq('id', user.id)
        .single();
      if (!profile?.is_manager) { router.replace('/dashboard'); return; }

      const managed = await getManagerManagedAgents(user.id);
      const agentRecord = managed.find(a => a.agent_user_id === agentId);
      if (agentRecord) {
        setAgentName(agentRecord.agent_name ?? agentRecord.agent_email.split('@')[0]);
        setAgentEmail(agentRecord.agent_email);
      }

      const sessionsData = await getAgentSessions(agentId);
      const withScores = sessionsData.map(sd => ({
        session: sd.session,
        scores: computeScores(sd.answers),
      }));
      setSessions(withScores);

      const avg = averageScores(withScores.map(s => s.scores));
      setAvgScores(avg);
      setOverall(computeOverall(avg));
      setLoading(false);
    }
    load().catch(console.error);
  }, [agentId, router]);

  const goodSections = avgScores.filter(s => s.pct >= PASS_THRESHOLD);
  const weakSections = avgScores.filter(s => s.pct < PASS_THRESHOLD);

  return (
    <main className="min-h-screen" style={{ background: 'var(--tgl-black)' }}>
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(215,255,0,0.1)' }}>
        <div className="flex items-center gap-3">
          <Image src="/tgl-logo.png" alt="TGL" width={36} height={36} className="object-contain" />
          <div>
            <button
              onClick={() => router.push('/manager')}
              className="text-xs font-bold"
              style={{ color: 'rgba(215,255,0,0.6)', fontFamily: 'var(--font-space)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--tgl-lime)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(215,255,0,0.6)'; }}
            >
              ← Manager Dashboard
            </button>
            <h1 className="text-base font-bold leading-tight mt-0.5" style={{ color: 'var(--tgl-white)', fontFamily: 'var(--font-space)', letterSpacing: '-0.02em' }}>
              {agentName || '…'}
            </h1>
          </div>
        </div>
        {agentEmail && (
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-montserrat)' }}>
            {agentEmail}
          </span>
        )}
      </header>

      <div className="px-6 py-8 max-w-4xl mx-auto">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-sm" style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-montserrat)' }}>Loading…</div>
          </div>
        ) : (
          <>
            {/* Overall summary card */}
            <div className="rounded-2xl p-6 mb-8" style={{ background: '#0d0d0d', border: '1px solid rgba(215,255,0,0.12)' }}>
              <div className="flex items-start justify-between mb-5">
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'rgba(215,255,0,0.6)', fontFamily: 'var(--font-space)' }}>
                    Performance Summary
                  </div>
                  <div className="text-xs" style={{ color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-montserrat)' }}>
                    Averaged across {sessions.length} session{sessions.length !== 1 ? 's' : ''}
                  </div>
                </div>
                {sessions.length > 0 && (
                  <div className="text-right">
                    <div className="text-4xl font-black" style={{ color: overall >= PASS_THRESHOLD ? 'var(--tgl-lime)' : '#f87171', fontFamily: 'var(--font-space)', letterSpacing: '-0.04em', lineHeight: 1 }}>
                      {Math.round(overall * 100)}%
                    </div>
                    <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-montserrat)' }}>overall</div>
                  </div>
                )}
              </div>

              {sessions.length === 0 ? (
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-montserrat)' }}>
                  This agent hasn&apos;t completed any sessions yet.
                </p>
              ) : (
                <>
                  {goodSections.length > 0 && (
                    <div className="mb-5">
                      <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(215,255,0,0.55)', fontFamily: 'var(--font-space)' }}>
                        Strong Sections
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {goodSections.map(s => <SectionCard key={s.key} score={s} />)}
                      </div>
                    </div>
                  )}
                  {weakSections.length > 0 && (
                    <div>
                      <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(239,68,68,0.65)', fontFamily: 'var(--font-space)' }}>
                        Needs Improvement
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {weakSections.map(s => <SectionCard key={s.key} score={s} />)}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Session list */}
            {sessions.length > 0 && (
              <div className="rounded-2xl overflow-hidden" style={{ background: '#0d0d0d', border: '1px solid rgba(215,255,0,0.1)' }}>
                <div className="px-5 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(215,255,0,0.6)', fontFamily: 'var(--font-space)' }}>
                    Session History
                  </h2>
                </div>
                {sessions.map(({ session, scores }) => (
                  <SessionRow
                    key={session.id}
                    session={session}
                    scores={scores}
                    onClick={() => router.push(`/results/${session.id}?from=manager`)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
