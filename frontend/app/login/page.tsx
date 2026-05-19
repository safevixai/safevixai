'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield, Eye, EyeOff, LogIn, AlertTriangle,
  CheckCircle2, Zap, Lock, Mail, ChevronRight,
  Wifi, WifiOff
} from 'lucide-react';
import { PUBLIC_API_BASE_URL } from '@/lib/public-env';
import { getSupabaseBrowserClient } from '@/lib/supabase-auth';
import { useAppStore } from '@/lib/store';
import { usePageEntry } from '@/hooks/usePageEntry';
import { useShallow } from 'zustand/react/shallow';

const API_URL = PUBLIC_API_BASE_URL;
const DEMO_CREDS: Array<{ label: string; email: string; password: string; color: string }> = [];

export default function LoginPage() {
  const router = useRouter();
  const { setAuth, isAuthenticated, setUserProfile } = useAppStore(useShallow((s) => ({ setAuth: s.setAuth, isAuthenticated: s.isAuthenticated, setUserProfile: s.setUserProfile })));
  const pageRef = usePageEntry();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [scanLine, setScanLine] = useState(0);
  const emailRef = useRef<HTMLInputElement>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) router.replace('/');
  }, [isAuthenticated, router]);

  // Animate scan line
  useEffect(() => {
    const id = setInterval(() => setScanLine(p => (p + 1) % 100), 50);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    document.title = 'Operator Auth | SafeVixAI';
    emailRef.current?.focus();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('All fields required.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        const { data, error: supabaseError } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

        if (!supabaseError && data.session?.access_token) {
          const displayName =
            (data.user?.user_metadata?.name as string | undefined) ||
            data.user?.email ||
            'SafeVixAI User';
          setAuth(displayName);
          setUserProfile({ name: displayName });
          setSuccess(`Welcome, ${displayName}`);
          setTimeout(() => router.replace('/'), 1200);
          return;
        }
      }

      const res = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'Invalid credentials');
      }

      const data = await res.json();
      setAuth(data.operator_name);
      setUserProfile({ name: data.operator_name });
      setSuccess(`Welcome, ${data.operator_name}`);
      setTimeout(() => router.replace('/'), 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoMode = () => {
    setError('Demo bypass is disabled. Use the configured operator login.');
  };

  const fillCreds = (c: typeof DEMO_CREDS[0]) => {
    setEmail(c.email);
    setPassword(c.password);
    setError('');
  };

  return (
    <div ref={pageRef} className="relative min-h-screen w-full bg-bg flex items-center justify-center overflow-hidden">

      {/* ── Tactical Background ── */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Spots removed per user request */}
        {/* Top-right green glow */}
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-brand/20 blur-[120px]" />
        {/* Bottom-left glow */}
        <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-brand-light/10 blur-[100px]" />

        {/* Animated scan line */}
        <div
          className="absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-brand-light/40 to-transparent transition-none pointer-events-none"
          style={{ top: `${scanLine}%` }}
        />
      </div>

      {/* ── Main Login Panel ── */}
      <div
        className="relative w-full max-w-md mx-4"
      >

        {/* Card */}
        <div className="relative rounded-xl border border-white/10 bg-surface-1/90 backdrop-blur-2xl overflow-hidden shadow-2xl shadow-black/60">

          {/* Top accent bar */}
          <div className="h-1 bg-gradient-to-r from-brand via-brand-light to-brand" />

          {/* Card Body */}
          <div className="p-8">

            {/* Logo + Brand */}
            <div className="flex flex-col items-center gap-4 mb-8">
              <div
                className="w-16 h-16 rounded-lg bg-brand flex items-center justify-center border border-brand-light/20"
              >
                <Shield size={32} className="text-white" />
              </div>

              <div className="text-center">
                <h1 className="text-2xl font-black text-white tracking-tight font-space uppercase">
                  SafeVixAI
                </h1>
                <p className="text-[10px] font-bold text-brand-light uppercase tracking-[0.1em] mt-0.5">
                  Operator Authentication
                </p>
              </div>

              {/* Status indicators */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand/20 border border-brand/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-light animate-pulse" />
                  <span className="text-[9px] font-semibold text-brand-light uppercase tracking-widest">Sentinel Online</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                  <Lock size={9} className="text-text-2" />
                  <span className="text-[9px] font-semibold text-text-3 uppercase tracking-widest">JWT Secured</span>
                </div>
              </div>
            </div>

            {/* ── Auth Form ── */}
            <form onSubmit={handleLogin} className="flex flex-col gap-4" noValidate>

              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-semibold text-text-3 uppercase tracking-[0.25em] pl-1">
                  Operator Email
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-4 pointer-events-none" />
                  <input
                    ref={emailRef}
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError(''); }}
                    placeholder="operator@safevixai.app"
                    className="w-full h-12 pl-11 pr-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-text-3 text-sm font-medium focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/40 transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-semibold text-text-3 uppercase tracking-[0.25em] pl-1">
                  Access Key
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-4 pointer-events-none" />
                  <input
                    type={showPwd ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(''); }}
                    placeholder="••••••••••••"
                    className="w-full h-12 pl-11 pr-12 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-text-3 text-sm font-medium focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/40 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text-4 hover:text-text-3 transition-colors"
                    aria-label={showPwd ? 'Hide password' : 'Show password'}
                  >
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Error / Success messages */}
                              {error && (
                  <div
                    key="error"
                    className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20"
                  >
                    <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />
                    <span className="text-[12px] font-bold text-red-400">{error}</span>
                  </div>
                )}
                {success && (
                  <div
                    key="success"
                    className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-brand-light/10 border border-brand-light/20"
                  >
                    <CheckCircle2 size={14} className="text-brand-light flex-shrink-0" />
                    <span className="text-[12px] font-bold text-brand-light">{success}</span>
                  </div>
                )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="relative h-13 w-full rounded-xl bg-brand hover:bg-[#145230] disabled:opacity-60 disabled:cursor-not-allowed border border-brand/40 text-white font-black text-sm uppercase tracking-widest transition-all shadow-lg shadow-brand/20 overflow-hidden flex items-center justify-center gap-2 mt-1"
                style={{ height: '52px' }}
              >
                {/* Shimmer on hover */}
                <div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12"
                />
                {loading ? (
                  <>
                    <div
                      className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                    />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <LogIn size={16} />
                    <span>Enter Command Center</span>
                  </>
                )}
              </button>
            </form>

            {/* ── Divider ── */}
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-white/8" />
              <span className="text-[9px] font-semibold text-text-3 uppercase tracking-widest">or</span>
              <div className="flex-1 h-px bg-white/8" />
            </div>

            {/* ── Demo Mode Button ── */}
            <button
              onClick={handleDemoMode}
              disabled={loading}
              className="w-full h-12 rounded-xl border border-white/10 bg-white/5 hover:bg-white/8 hover:border-brand/30 transition-all text-text-2 hover:text-white text-[12px] font-black uppercase tracking-widest flex items-center justify-center gap-2 group"
            >
              <Zap size={14} className="text-brand-light group-hover:animate-pulse" />
              Demo Mode (Hackathon)
              <ChevronRight size={13} className="text-text-4 group-hover:text-brand-light group-hover:translate-x-0.5 transition-all" />
            </button>

            {/* ── Quick-fill Demo Credentials ── */}
            <div className="mt-5 flex flex-col gap-2">
              <p className="text-[8px] font-semibold text-text-3 uppercase tracking-[0.1em] text-center mb-1">
                Demo Credentials
              </p>
              <div className="grid grid-cols-2 gap-2">
                {DEMO_CREDS.map((c) => (
                  <button
                    key={c.email}
                    onClick={() => fillCreds(c)}
                    type="button"
                    className="flex flex-col items-start gap-0.5 px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/8 border border-white/10 hover:border-brand/30 transition-all text-left"
                  >
                    <span className={`text-[10px] font-semibold uppercase tracking-wide ${c.color}`}>
                      {c.label}
                    </span>
                    <span className="text-[9px] font-mono text-text-4 truncate w-full">{c.email}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-white/5 px-8 py-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Shield size={10} className="text-brand" />
              <span className="text-[8px] font-semibold text-text-3 uppercase tracking-[0.1em]">
                SafeVixAI Sentinel Protocol
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Wifi size={9} className="text-brand-light" />
              <span className="text-[8px] font-bold text-brand-light uppercase tracking-widest">Secure</span>
            </div>
          </div>
        </div>

        {/* Outside card — version tag */}
        <p className="text-center text-[9px] font-bold text-text-3 uppercase tracking-[0.1em] mt-5">
          SafeVixAI v2.4 · IIT Madras Hackathon 2026
        </p>
      </div>
    </div>
  );
}
