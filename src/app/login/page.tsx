// src/app/login/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { loginWithPassword } from '@/app/actions/auth';
import { Mail, Lock, ArrowRight, ShieldCheck, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handlePasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    const formData = new FormData(e.currentTarget);
    const res = await loginWithPassword(formData);
    if (res?.error) {
      setErrorMsg(res.error);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[100dvh] flex flex-col justify-between p-6 sm:p-10 max-w-md mx-auto w-full bg-[var(--bg)]">
      {/* ── Top: Brand Header ── */}
      <div className="pt-6 sm:pt-10">
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-11 h-11 rounded-2xl bg-[var(--accent)] flex items-center justify-center font-bold text-white text-xl shadow-lg shadow-[var(--accent)]/30">
            H
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[var(--text)]">Hajri</h1>
            <p className="text-xs text-[var(--text-muted)]">Indian Payroll & Workforce Platform</p>
          </div>
        </div>

        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text)] tracking-tight">
            Welcome back
          </h2>
          <p className="text-sm text-[var(--text-muted)] mt-1.5 leading-relaxed">
            Sign in with your email and password to manage attendance and payroll.
          </p>
        </div>
      </div>

      {/* ── Middle: Auth Form ── */}
      <div className="my-auto py-8">
        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-[var(--negative)]/15 border border-[var(--negative)]/30 text-xs text-[var(--negative)] leading-relaxed">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                placeholder="name@company.com"
                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 text-base sm:text-sm text-[var(--text)] placeholder-[var(--text-muted)]/40 focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 transition-all pl-11"
              />
              <Mail className="w-4 h-4 text-[var(--text-muted)] absolute left-4 top-3.5" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 text-base sm:text-sm text-[var(--text)] placeholder-[var(--text-muted)]/40 focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 transition-all pl-11 pr-11"
              />
              <Lock className="w-4 h-4 text-[var(--text-muted)] absolute left-4 top-3.5" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 p-0.5 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors focus:outline-none cursor-pointer"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[var(--accent)] hover:bg-[var(--accent-2)] text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-[var(--accent)]/30 flex items-center justify-center space-x-2 text-sm disabled:opacity-50 mt-4 cursor-pointer active:scale-[0.98]"
          >
            <span>{loading ? 'Signing In...' : 'Sign In'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* ── Bottom: Footer Links & Security Badge ── */}
      <div className="pb-6 sm:pb-8 pt-4 border-t border-[var(--border)]/60 text-center space-y-3">
        <p className="text-sm text-[var(--text-muted)]">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-[var(--accent)] font-semibold hover:underline">
            Sign Up
          </Link>
        </p>

        <div className="flex items-center justify-center gap-1.5 text-[11px] text-[var(--text-muted)] opacity-70">
          <ShieldCheck size={13} />
          <span>Secured by Supabase PostgreSQL Auth</span>
        </div>
      </div>
    </div>
  );
}


