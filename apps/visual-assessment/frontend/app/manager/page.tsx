'use client';

import Image from 'next/image';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getManagerManagedAgents, getAgentSessions, removeManagerManagedAgent } from '@/lib/supabase-helpers';
import type { ManagedAgent } from '@/lib/supabase-helpers';
import { computeScores, computeOverall, averageScores, PASS_THRESHOLD } from '@/lib/utils/scores';
import type { SectionScore } from '@/lib/utils/scores';

interface AgentWithStats {
  agent: ManagedAgent;
  sessionCount: number;
  avgScores: SectionScore[];
  overall: number;
}

// ─── Add Agent Modal ──────────────────────────────────────────────────────────

function AddAgentModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/manager/add-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Failed to add agent.'); return; }
      onAdded();
      onClose();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6"
        style={{ background: '#111', border: '1px solid rgba(215,255,0,0.15)', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}
      >
        <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--tgl-white)', fontFamily: 'var(--font-space)', letterSpacing: '-0.02em' }}>
          Add Agent
        </h2>
        <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.45)', fontFamily: 'var(--font-montserrat)' }}>
          Enter the agent&apos;s credentials. A new account will be created if none exists.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="block text-xs font-bold mb-1.5 uppercase tracking-widest" style={{ color: 'rgba(215,255,0,0.6)', fontFamily: 'var(--font-space)' }}>Name (optional)</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ahmed Shaheen"
              className="w-full px-4 py-2.5 rounded-xl text-sm"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--tgl-white)', fontFamily: 'var(--font-montserrat)', outline: 'none' }}
            />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1.5 uppercase tracking-widest" style={{ color: 'rgba(215,255,0,0.6)', fontFamily: 'var(--font-space)' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="agent@example.com"
              className="w-full px-4 py-2.5 rounded-xl text-sm"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--tgl-white)', fontFamily: 'var(--font-montserrat)', outline: 'none' }}
            />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1.5 uppercase tracking-widest" style={{ color: 'rgba(215,255,0,0.6)', fontFamily: 'var(--font-space)' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full px-4 py-2.5 rounded-xl text-sm"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--tgl-white)', fontFamily: 'var(--font-montserrat)', outline: 'none' }}
            />
          </div>

          {error && (
            <p className="text-sm px-3 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)', fontFamily: 'var(--font-montserrat)' }}>
              {error}
            </p>
          )}

          <div className="flex gap-3 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors duration-150"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)', fontFamily: 'var(--font-space)', cursor: 'pointer' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold"
              style={{ background: loading ? 'rgba(215,255,0,0.1)' : 'var(--tgl-lime)', color: loading ? 'rgba(215,255,0,0.4)' : '#000', fontFamily: 'var(--font-space)', cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? 'Adding…' : 'Add Agent'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Section Score Pills ──────────────────────────────────────────────────────

function ScorePill({ score }: { score: SectionScore }) {
  const pass = score.pct >= PASS_THRESHOLD;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
      style={{
        background: pass ? 'rgba(215,255,0,0.08)' : 'rgba(239,68,68,0.08)',
        color: pass ? 'rgba(215,255,0,0.9)' : '#f87171',
        border: `1px solid ${pass ? 'rgba(215,255,0,0.18)' : 'rgba(239,68,68,0.2)'}`,
        fontFamily: 'var(--font-space)',
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: pass ? 'var(--tgl-lime)' : '#ef4444', display: 'inline-block', flexShrink: 0 }} />
      {score.label} {Math.round(score.pct * 100)}%
    </span>
  );
}

// ─── Agent Card ───────────────────────────────────────────────────────────────

function AgentCard({ data, onClick, onRemove }: { data: AgentWithStats; onClick: () => void; onRemove: (id: string) => void }) {
  const { agent, sessionCount, avgScores, overall } = data;
  const displayName = agent.agent_name ?? agent.agent_email.split('@')[0];
  const goodSections = avgScores.filter(s => s.pct >= PASS_THRESHOLD);
  const weakSections = avgScores.filter(s => s.pct < PASS_THRESHOLD);
  const overallPass = overall >= PASS_THRESHOLD;

  return (
    <div
      className="group relative rounded-2xl p-5 flex flex-col cursor-pointer"
      style={{ background: '#0d0d0d', border: '1px solid rgba(215,255,0,0.1)', transition: 'border-color 0.2s ease, box-shadow 0.2s ease', height: '400px' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(215,255,0,0.25)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px rgba(215,255,0,0.06)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(215,255,0,0.1)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
      onClick={onClick}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-4 shrink-0">
        <div>
          <div className="text-base font-bold leading-tight" style={{ color: 'var(--tgl-white)', fontFamily: 'var(--font-space)', letterSpacing: '-0.02em' }}>
            {displayName}
          </div>
          <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-montserrat)' }}>
            {agent.agent_email}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-xs px-2.5 py-1 rounded-full font-bold"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-space)', whiteSpace: 'nowrap' }}>
            {sessionCount} session{sessionCount !== 1 ? 's' : ''}
          </div>
          {sessionCount > 0 && (
            <div className="text-sm font-black"
              style={{ color: overallPass ? 'var(--tgl-lime)' : '#f87171', fontFamily: 'var(--font-space)', letterSpacing: '-0.02em' }}>
              {Math.round(overall * 100)}%
            </div>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); if (window.confirm(`Remove ${displayName} from your team?`)) onRemove(agent.id); }}
            className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-opacity duration-150"
            style={{ background: 'rgba(239,68,68,0.1)', color: 'rgba(239,68,68,0.6)', border: '1px solid rgba(239,68,68,0.2)', lineHeight: 1, flexShrink: 0 }}
            onMouseEnter={e => { e.stopPropagation(); (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.2)'; (e.currentTarget as HTMLElement).style.color = '#f87171'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.1)'; (e.currentTarget as HTMLElement).style.color = 'rgba(239,68,68,0.6)'; }}
            title="Remove agent from team"
          >
            ×
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 min-h-0 mt-4 flex flex-col gap-2.5">
        {sessionCount === 0 ? (
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-montserrat)' }}>
            No sessions completed yet.
          </p>
        ) : (
          <>
            {goodSections.length > 0 && (
              <div className="shrink-0">
                <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(215,255,0,0.5)', fontFamily: 'var(--font-space)' }}>Strong</div>
                <div className="flex flex-wrap gap-1.5">
                  {goodSections.map(s => <ScorePill key={s.key} score={s} />)}
                </div>
              </div>
            )}
            {weakSections.length > 0 && (
              <div className="flex flex-col flex-1 min-h-0">
                <div className="text-xs font-bold uppercase tracking-widest mb-2 shrink-0" style={{ color: 'rgba(239,68,68,0.6)', fontFamily: 'var(--font-space)' }}>Needs Work</div>
                <div className="flex flex-wrap content-start gap-1.5 overflow-y-auto landmark-scroll flex-1 pr-1">
                  {weakSections.map(s => <ScorePill key={s.key} score={s} />)}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end mt-4 shrink-0">
        <span className="text-xs font-bold" style={{ color: 'rgba(215,255,0,0.6)', fontFamily: 'var(--font-space)' }}>
          View Details →
        </span>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ManagerPage() {
  const router = useRouter();
  const [managerId, setManagerId] = useState<string | null>(null);
  const [agents, setAgents] = useState<AgentWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const loadAgents = useCallback(async (mId: string) => {
    setLoading(true);
    try {
      const managed = await getManagerManagedAgents(mId);
      const withStats: AgentWithStats[] = await Promise.all(
        managed.map(async (agent) => {
          const sessionsData = await getAgentSessions(agent.agent_user_id);
          const allScores = sessionsData.map(sd => computeScores(sd.answers));
          const avgScores = averageScores(allScores);
          const overall = computeOverall(avgScores);
          return { agent, sessionCount: sessionsData.length, avgScores, overall };
        })
      );
      setAgents(withStats);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.replace('/auth'); return; }
      const { data: profile } = await supabase.from('va_profiles').select('is_manager').eq('id', user.id).single();
      if (!profile?.is_manager) { router.replace('/dashboard'); return; }
      setManagerId(user.id);
      loadAgents(user.id);
    });
  }, [router, loadAgents]);

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.replace('/auth');
  }

  function handleAgentAdded() {
    if (managerId) loadAgents(managerId);
  }

  async function handleRemoveAgent(id: string) {
    setAgents(prev => prev.filter(a => a.agent.id !== id));
    try {
      await removeManagerManagedAgent(id);
    } catch (err) {
      console.error(err);
      if (managerId) loadAgents(managerId);
    }
  }

  const withSessions = agents.filter(a => a.sessionCount > 0);
  const teamAvg = withSessions.length > 0
    ? Math.round(withSessions.reduce((s, a) => s + a.overall, 0) / withSessions.length * 100)
    : null;

  return (
    <main className="min-h-screen" style={{ background: 'var(--tgl-black)' }}>
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(215,255,0,0.1)' }}>
        <div className="flex items-center gap-3">
          <Image src="/tgl-logo.png" alt="TGL" width={36} height={36} className="object-contain" />
          <div>
            <h1 className="text-lg font-bold leading-none" style={{ color: 'var(--tgl-white)', fontFamily: 'var(--font-space)', letterSpacing: '-0.03em' }}>
              Manager Dashboard
            </h1>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-montserrat)' }}>
              Your team · North Coast
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 rounded-xl text-sm font-bold transition-all duration-150"
            style={{ background: 'var(--tgl-lime)', color: '#000', fontFamily: 'var(--font-space)', boxShadow: '0 0 16px rgba(215,255,0,0.25)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 0 24px rgba(215,255,0,0.4)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 0 16px rgba(215,255,0,0.25)'; (e.currentTarget as HTMLElement).style.transform = 'none'; }}
          >
            + Add Agent
          </button>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="px-3 py-2 rounded-xl text-xs font-bold transition-colors duration-150"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)', fontFamily: 'var(--font-space)', cursor: signingOut ? 'not-allowed' : 'pointer' }}
            onMouseEnter={e => { if (!signingOut) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }}
          >
            {signingOut ? 'Signing out…' : 'Log Out'}
          </button>
        </div>
      </header>

      <div className="px-6 py-8 max-w-5xl mx-auto">
        {/* Stats bar */}
        <div className="flex items-center gap-6 mb-8">
          <div>
            <div className="text-3xl font-black" style={{ color: 'var(--tgl-white)', fontFamily: 'var(--font-space)', letterSpacing: '-0.04em' }}>
              {agents.length}
            </div>
            <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-montserrat)' }}>Managed agents</div>
          </div>
          <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.08)' }} />
          <div>
            <div className="text-3xl font-black" style={{ color: 'var(--tgl-white)', fontFamily: 'var(--font-space)', letterSpacing: '-0.04em' }}>
              {agents.reduce((s, a) => s + a.sessionCount, 0)}
            </div>
            <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-montserrat)' }}>Total sessions</div>
          </div>
          {teamAvg !== null && (
            <>
              <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.08)' }} />
              <div>
                <div className="text-3xl font-black" style={{ color: 'var(--tgl-lime)', fontFamily: 'var(--font-space)', letterSpacing: '-0.04em' }}>
                  {teamAvg}%
                </div>
                <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-montserrat)' }}>Team average</div>
              </div>
            </>
          )}
        </div>

        {/* Agent grid */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-sm" style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-montserrat)' }}>Loading agents…</div>
          </div>
        ) : agents.length === 0 ? (
          <div
            className="rounded-2xl p-12 text-center"
            style={{ border: '1px dashed rgba(215,255,0,0.15)', background: 'rgba(215,255,0,0.02)' }}
          >
            <div className="text-4xl mb-4">👥</div>
            <h3 className="text-base font-bold mb-2" style={{ color: 'var(--tgl-white)', fontFamily: 'var(--font-space)' }}>
              No agents yet
            </h3>
            <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-montserrat)' }}>
              Click &quot;+ Add Agent&quot; to start monitoring your team&apos;s performance.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="px-5 py-2.5 rounded-xl text-sm font-bold transition-opacity duration-150"
              style={{ background: 'var(--tgl-lime)', color: '#000', fontFamily: 'var(--font-space)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.85'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
            >
              + Add First Agent
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {agents.map(data => (
              <AgentCard
                key={data.agent.id}
                data={data}
                onClick={() => router.push(`/manager/agent/${data.agent.agent_user_id}`)}
                onRemove={handleRemoveAgent}
              />
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <AddAgentModal onClose={() => setShowModal(false)} onAdded={handleAgentAdded} />
      )}
    </main>
  );
}
