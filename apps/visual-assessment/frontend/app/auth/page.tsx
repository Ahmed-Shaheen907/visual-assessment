'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { createProfile, getUserProfile } from '@/lib/supabase-helpers';

type Tab = 'login' | 'signup';
type SignupRole = 'agent' | 'leader';

const inputStyle = {
  background: '#0d0d0d',
  border: '1px solid rgba(255,255,255,0.1)',
  color: 'var(--tgl-white)',
  fontFamily: 'var(--font-montserrat)',
};

function Field({
  id, label, type = 'text', value, onChange, placeholder,
}: {
  id: string; label: string; type?: string; value: string;
  onChange: (v: string) => void; placeholder: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-xs font-bold uppercase tracking-widest"
        style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-space)' }}
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required
        autoComplete={type === 'password' ? 'current-password' : undefined}
        className="w-full px-4 py-2.5 rounded-xl text-sm font-medium outline-none transition-all duration-200"
        style={inputStyle}
        onFocus={(e) => {
          e.target.style.border = '1px solid rgba(215,255,0,0.5)';
          e.target.style.boxShadow = '0 0 0 3px rgba(215,255,0,0.08)';
        }}
        onBlur={(e) => {
          e.target.style.border = '1px solid rgba(255,255,255,0.1)';
          e.target.style.boxShadow = 'none';
        }}
      />
    </div>
  );
}

export default function AuthPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('login');
  const [signupRole, setSignupRole] = useState<SignupRole>('agent');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmSent, setConfirmSent] = useState(false);

  function reset() {
    setError('');
    setConfirmSent(false);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;
      const profile = await getUserProfile(data.user.id);
      router.replace(profile?.is_manager ? '/manager' : '/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setError(msg.includes('Invalid') ? 'Incorrect email or password.' : msg);
      setLoading(false);
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    setError('');
    try {
      const { data, error: authError } = await supabase.auth.signUp({ email, password });
      if (authError) throw authError;

      if (!data.session) {
        setConfirmSent(true);
        setLoading(false);
        return;
      }

      const isManager = signupRole === 'leader';
      await createProfile(data.user!.id, name.trim(), isManager);
      localStorage.setItem('va_agent_name', name.trim());
      router.replace(isManager ? '/manager' : '/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign up failed';
      setError(msg.includes('already') ? 'An account with this email already exists.' : msg);
      setLoading(false);
    }
  }

  const disabled = loading || !email.trim() || !password.trim() || (tab === 'signup' && !name.trim());

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: 'var(--tgl-black)' }}
    >
      {/* Background grain */}
      <div
        aria-hidden
        style={{
          position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.035'/%3E%3C/svg%3E\")",
        }}
      />
      {/* Radial glow */}
      <div
        aria-hidden
        style={{
          position: 'fixed', top: '30%', left: '50%', transform: 'translate(-50%, -50%)',
          width: 600, height: 600, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(215,255,0,0.06) 0%, transparent 70%)',
          pointerEvents: 'none', zIndex: 0,
        }}
      />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-4">
          <Image src="/tgl-logo.png" alt="TGL" width={40} height={40} className="object-contain" />
        </div>

        {/* Heading */}
        <div className="text-center mb-6">
          <h1
            className="text-3xl font-black tracking-tight leading-none mb-1"
            style={{ fontFamily: 'var(--font-space)', color: 'var(--tgl-white)', letterSpacing: '-0.03em' }}
          >
            North Coast
          </h1>
          <h2
            className="text-3xl font-black tracking-tight leading-none"
            style={{ fontFamily: 'var(--font-space)', color: 'var(--tgl-lime)', letterSpacing: '-0.03em' }}
          >
            Assessment
          </h2>
        </div>

        {confirmSent ? (
          /* Confirmation pending state */
          <div
            className="rounded-2xl p-8 text-center"
            style={{ border: '1px solid rgba(215,255,0,0.15)', background: 'rgba(215,255,0,0.04)' }}
          >
            <div className="text-3xl mb-4">✉️</div>
            <h3
              className="text-lg font-bold mb-2"
              style={{ fontFamily: 'var(--font-space)', color: 'var(--tgl-white)' }}
            >
              Check your email
            </h3>
            <p
              className="text-sm leading-relaxed mb-6"
              style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-montserrat)' }}
            >
              We sent a confirmation link to <strong style={{ color: 'var(--tgl-white)' }}>{email}</strong>. Click it to activate your account, then come back and log in.
            </p>
            <button
              onClick={() => { setTab('login'); setConfirmSent(false); setPassword(''); }}
              className="text-sm font-bold transition-opacity hover:opacity-70"
              style={{ color: 'var(--tgl-lime)', fontFamily: 'var(--font-space)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Back to Log In →
            </button>
          </div>
        ) : (
          <>
            {/* Tab switcher */}
            <div
              className="flex rounded-xl mb-3 p-1"
              style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              {(['login', 'signup'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => { setTab(t); reset(); }}
                  className="flex-1 py-2.5 rounded-lg text-sm font-bold transition-all duration-200"
                  style={{
                    fontFamily: 'var(--font-space)',
                    background: tab === t ? 'rgba(215,255,0,0.12)' : 'transparent',
                    color: tab === t ? 'var(--tgl-lime)' : 'rgba(255,255,255,0.35)',
                    border: tab === t ? '1px solid rgba(215,255,0,0.25)' : '1px solid transparent',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => { if (tab !== t) (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.6)'; }}
                  onMouseLeave={e => { if (tab !== t) (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.35)'; }}
                >
                  {t === 'login' ? 'Log In' : 'Sign Up'}
                </button>
              ))}
            </div>

            {/* Form */}
            <form onSubmit={tab === 'login' ? handleLogin : handleSignup} className="flex flex-col gap-3">
              {tab === 'signup' && (
                <>
                  <Field id="name" label="Full Name" value={name} onChange={setName} placeholder="Ahmed Shaheen" />

                  {/* Role selector */}
                  <div className="flex flex-col gap-1.5">
                    <span
                      className="text-xs font-bold uppercase tracking-widest"
                      style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-space)' }}
                    >
                      Account Type
                    </span>
                    <div className="flex gap-2">
                      {([
                        { value: 'agent', label: 'Sales Agent' },
                        { value: 'leader', label: 'Team Leader' },
                      ] as const).map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setSignupRole(opt.value)}
                          className="flex-1 py-2 rounded-xl text-sm font-bold transition-all duration-150"
                          style={{
                            fontFamily: 'var(--font-space)',
                            background: signupRole === opt.value ? 'rgba(215,255,0,0.12)' : '#0d0d0d',
                            color: signupRole === opt.value ? 'var(--tgl-lime)' : 'rgba(255,255,255,0.4)',
                            border: signupRole === opt.value ? '1px solid rgba(215,255,0,0.35)' : '1px solid rgba(255,255,255,0.08)',
                            cursor: 'pointer',
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
              <Field id="email" label="Email Address" type="email" value={email} onChange={setEmail} placeholder="ahmed@company.com" />
              <Field id="password" label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••" />

              {error && (
                <p className="text-xs text-center" style={{ color: '#ef4444', fontFamily: 'var(--font-montserrat)' }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={disabled}
                className="mt-1 w-full py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all duration-150 active:scale-95"
                style={{
                  fontFamily: 'var(--font-space)',
                  background: disabled ? 'rgba(215,255,0,0.08)' : 'var(--tgl-lime)',
                  color: disabled ? 'rgba(215,255,0,0.3)' : '#000',
                  border: disabled ? '1px solid rgba(215,255,0,0.15)' : 'none',
                  boxShadow: disabled ? 'none' : 'var(--glow-lime)',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  letterSpacing: '0.08em',
                }}
              >
                {loading ? (tab === 'login' ? 'Signing in…' : 'Creating account…') : (tab === 'login' ? 'Log In →' : 'Create Account →')}
              </button>
            </form>
          </>
        )}

        {/* Steps preview */}
        {!confirmSent && (
          <div
            className="mt-5 flex items-center justify-center gap-3"
            style={{ color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-montserrat)', fontSize: 11 }}
          >
            {['Map Quiz', 'Section Detail', 'Q&A', 'Report'].map((step, i) => (
              <div key={step} className="flex items-center gap-3">
                <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>{step}</span>
                {i < 3 && <span style={{ fontSize: 8 }}>›</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
