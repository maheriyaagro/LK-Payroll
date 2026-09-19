// src/app/signup/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signupWithPassword } from '@/app/actions/auth';
import { Mail, Lock, ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';

export default function SignupPage() {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  async function handlePasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    const formData = new FormData(e.currentTarget);
    const res = await signupWithPassword(formData);
    setLoading(false);
    if (res?.error) {
      setErrorMsg(res.error);
    } else if (res?.message) {
      setSuccessMsg(res.message);
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
            Create Account
          </h2>
          <p className="text-sm text-[var(--text-muted)] mt-1.5 leading-relaxed">
            Register your business to start tracking attendance and automating payroll.
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

        {successMsg && (
          <div className="mb-6 p-4 rounded-xl bg-[var(--positive)]/15 border border-[var(--positive)]/30 text-xs text-[var(--positive)] leading-relaxed flex items-start gap-2.5">
            <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Account Created</p>
              <p className="mt-0.5">{successMsg}</p>
            </div>
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
              Work Email
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
                type="password"
                name="password"
                required
                autoComplete="new-password"
                placeholder="Minimum 6 characters"
                minLength={6}
                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 text-base sm:text-sm text-[var(--text)] placeholder-[var(--text-muted)]/40 focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 transition-all pl-11"
              />
              <Lock className="w-4 h-4 text-[var(--text-muted)] absolute left-4 top-3.5" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[var(--accent)] hover:bg-[var(--accent-2)] text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-[var(--accent)]/30 flex items-center justify-center space-x-2 text-sm disabled:opacity-50 mt-4 cursor-pointer active:scale-[0.98]"
          >
            <span>{loading ? 'Creating Account...' : 'Continue to Onboarding'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* ── Bottom: Footer Links & Security Badge ── */}
      <div className="pb-6 sm:pb-8 pt-4 border-t border-[var(--border)]/60 text-center space-y-3">
        <p className="text-sm text-[var(--text-muted)]">
          Already have an account?{' '}
          <Link href="/login" className="text-[var(--accent)] font-semibold hover:underline">
            Sign In
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


