'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createSession } from '@/lib/supabase-helpers';

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setLoading(true);
    setError('');
    try {
      const sessionId = await createSession(name.trim(), email.trim());
      localStorage.setItem('va_session_id', sessionId);
      localStorage.setItem('va_agent_name', name.trim());
      router.push('/game');
    } catch {
      setError('Failed to start session. Please try again.');
      setLoading(false);
    }
  }

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center p-8"
      style={{ background: 'var(--tgl-black)' }}
    >
      {/* Background grain */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' opacity=\'0.035\'/%3E%3C/svg%3E")',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Radial glow */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          top: '30%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(215,255,0,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-10">
          <Image src="/tgl-logo.png" alt="TGL" width={52} height={52} className="object-contain" />
        </div>

        {/* Heading */}
        <div className="text-center mb-10">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-5"
            style={{
              border: '1px solid rgba(215,255,0,0.25)',
              color: 'var(--tgl-lime)',
              background: 'rgba(215,255,0,0.06)',
              fontFamily: 'var(--font-space)',
            }}
          >
            Sales Knowledge Assessment
          </div>
          <h1
            className="text-4xl font-black tracking-tight leading-none mb-3"
            style={{ fontFamily: 'var(--font-space)', color: 'var(--tgl-white)', letterSpacing: '-0.03em' }}
          >
            North Coast
          </h1>
          <h2
            className="text-4xl font-black tracking-tight leading-none mb-5"
            style={{ fontFamily: 'var(--font-space)', color: 'var(--tgl-lime)', letterSpacing: '-0.03em' }}
          >
            Assessment
          </h2>
          <p
            className="text-sm leading-relaxed"
            style={{ color: 'rgba(255,255,255,0.45)', fontFamily: 'var(--font-montserrat)', maxWidth: 320, margin: '0 auto' }}
          >
            Test your knowledge of the North Coast — locations, landmarks, and selling points.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleStart} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="name"
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-space)' }}
            >
              Full Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ahmed Shaheen"
              required
              className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none transition-all duration-200"
              style={{
                background: '#0d0d0d',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'var(--tgl-white)',
                fontFamily: 'var(--font-montserrat)',
              }}
              onFocus={(e) => { e.target.style.border = '1px solid rgba(215,255,0,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(215,255,0,0.08)'; }}
              onBlur={(e) => { e.target.style.border = '1px solid rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="email"
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-space)' }}
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ahmed@company.com"
              required
              className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none transition-all duration-200"
              style={{
                background: '#0d0d0d',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'var(--tgl-white)',
                fontFamily: 'var(--font-montserrat)',
              }}
              onFocus={(e) => { e.target.style.border = '1px solid rgba(215,255,0,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(215,255,0,0.08)'; }}
              onBlur={(e) => { e.target.style.border = '1px solid rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
            />
          </div>

          {error && (
            <p className="text-xs text-center" style={{ color: '#ef4444', fontFamily: 'var(--font-montserrat)' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !name.trim() || !email.trim()}
            className="mt-2 w-full py-4 rounded-xl text-sm font-black uppercase tracking-widest transition-all duration-150 active:scale-95"
            style={{
              fontFamily: 'var(--font-space)',
              background: loading || !name.trim() || !email.trim() ? 'rgba(215,255,0,0.08)' : 'var(--tgl-lime)',
              color: loading || !name.trim() || !email.trim() ? 'rgba(215,255,0,0.3)' : '#000',
              border: loading || !name.trim() || !email.trim() ? '1px solid rgba(215,255,0,0.15)' : 'none',
              boxShadow: loading || !name.trim() || !email.trim() ? 'none' : 'var(--glow-lime)',
              cursor: loading || !name.trim() || !email.trim() ? 'not-allowed' : 'pointer',
              letterSpacing: '0.08em',
            }}
          >
            {loading ? 'Starting…' : 'Begin Assessment →'}
          </button>
        </form>

        {/* Steps preview */}
        <div
          className="mt-10 flex items-center justify-center gap-3"
          style={{ color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-montserrat)', fontSize: 11 }}
        >
          {['Map Quiz', 'Section Detail', 'Q&A', 'Report'].map((step, i) => (
            <div key={step} className="flex items-center gap-3">
              <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>{step}</span>
              {i < 3 && <span style={{ fontSize: 8 }}>›</span>}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
