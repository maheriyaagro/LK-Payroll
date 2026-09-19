// src/app/onboarding/page.tsx
'use client';

import { useState } from 'react';
import { completeOnboardingAction, OnboardingPayload } from '@/app/actions/onboarding';
import { Building2, FileText, UserPlus, CheckCircle2, ArrowRight, ArrowLeft, Sparkles, AlertCircle } from 'lucide-react';

const INDIAN_STATES = [
  { code: '27', name: 'Maharashtra' },
  { code: '24', name: 'Gujarat' },
  { code: '29', name: 'Karnataka' },
  { code: '07', name: 'Delhi' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '19', name: 'West Bengal' },
  { code: '36', name: 'Telangana' },
  { code: '08', name: 'Rajasthan' },
  { code: '06', name: 'Haryana' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '32', name: 'Kerala' },
  { code: '21', name: 'Odisha' },
  { code: '03', name: 'Punjab' },
  { code: '10', name: 'Bihar' },
];

export default function OnboardingPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Step 1: Business Details
  const [businessName, setBusinessName] = useState('');
  const [stateCode, setStateCode] = useState('27');

  // Step 2: PAN & Tax (Optional)
  const [pan, setPan] = useState('');

  // Step 3: First Employee (Optional & Skippable)
  const [empName, setEmpName] = useState('');
  const [empPhone, setEmpPhone] = useState('');
  const [empDept, setEmpDept] = useState('');
  const [empDesignation, setEmpDesignation] = useState('');
  const [empType, setEmpType] = useState<'monthly' | 'daily' | 'hourly' | 'contract'>('monthly');

  async function handleSubmit(skipEmployee = false) {
    if (!businessName.trim()) {
      setErrorMsg('Business name is required.');
      setStep(1);
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const payload: OnboardingPayload = {
      name: businessName.trim(),
      stateCode: stateCode,
      pan: pan.trim() ? pan.trim().toUpperCase() : undefined,
    };

    if (!skipEmployee && empName.trim()) {
      payload.firstEmployee = {
        name: empName.trim(),
        phone: empPhone.trim() ? empPhone.trim() : undefined,
        department: empDept.trim() ? empDept.trim() : undefined,
        designation: empDesignation.trim() ? empDesignation.trim() : undefined,
        employmentType: empType,
      };
    }

    const res = await completeOnboardingAction(payload);
    if (res?.error) {
      setErrorMsg(res.error);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg)]">
      <div className="w-full max-w-lg bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-card)] p-6 md:p-8 shadow-2xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-[var(--accent-soft)] rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />

        {/* Brand Header */}
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent)] flex items-center justify-center font-bold text-[var(--on-accent)] text-xl shadow-md">
            H
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[var(--text)]">Hajri</h1>
            <p className="text-xs text-[var(--text-muted)]">Organization Onboarding</p>
          </div>
        </div>

        {/* 3-Step Wizard Indicator */}
        <div className="flex items-center justify-between mb-8 relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-[2px] bg-[var(--border)] z-0" />
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 h-[2px] bg-[var(--accent)] z-0 transition-all duration-300"
            style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }}
          />

          {/* Step 1 Chip */}
          <div className="relative z-10 flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step >= 1
                  ? 'bg-[var(--accent)] text-[var(--on-accent)] shadow-md'
                  : 'bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--text-muted)]'
              }`}
            >
              1
            </div>
            <span className="text-[10px] font-medium text-[var(--text-muted)] mt-1">Business</span>
          </div>

          {/* Step 2 Chip */}
          <div className="relative z-10 flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step >= 2
                  ? 'bg-[var(--accent)] text-[var(--on-accent)] shadow-md'
                  : 'bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--text-muted)]'
              }`}
            >
              2
            </div>
            <span className="text-[10px] font-medium text-[var(--text-muted)] mt-1">PAN</span>
          </div>

          {/* Step 3 Chip */}
          <div className="relative z-10 flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step >= 3
                  ? 'bg-[var(--accent)] text-[var(--on-accent)] shadow-md'
                  : 'bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--text-muted)]'
              }`}
            >
              3
            </div>
            <span className="text-[10px] font-medium text-[var(--text-muted)] mt-1">Staff</span>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-5 p-3 rounded-xl bg-[var(--negative)]/15 border border-[var(--negative)]/30 text-xs text-[var(--negative)] flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* STEP 1: Business Details */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-[var(--text)] flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-[var(--accent)]" />
                <span>Tell us about your business</span>
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-1">This will be your primary organization workspace</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
                Business / Legal Name <span className="text-[var(--accent)]">*</span>
              </label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Apex Infra & Projects Pvt Ltd"
                required
                className="w-full bg-[var(--surface-raised)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--text)] placeholder-[var(--text-muted)]/50 focus:outline-none focus:border-[var(--accent)] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
                State of Registration <span className="text-[var(--accent)]">*</span>
              </label>
              <select
                value={stateCode}
                onChange={(e) => setStateCode(e.target.value)}
                className="w-full bg-[var(--surface-raised)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--accent)] transition-colors"
              >
                {INDIAN_STATES.map((s) => (
                  <option key={s.code} value={s.code} className="bg-[var(--surface)] text-[var(--text)]">
                    {s.name} (State Code {s.code})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-[var(--text-muted)] mt-1">Used for Professional Tax (PT) and regional labor compliance.</p>
            </div>

            <button
              type="button"
              disabled={!businessName.trim()}
              onClick={() => { setErrorMsg(null); setStep(2); }}
              className="w-full bg-[var(--accent)] hover:bg-[var(--accent-2)] text-[var(--on-accent)] font-semibold py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center space-x-2 text-sm disabled:opacity-50 mt-6"
            >
              <span>Continue to Tax Details</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 2: PAN & Tax (Optional) */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-[var(--text)] flex items-center space-x-2">
                <FileText className="w-5 h-5 text-[var(--accent)]" />
                <span>Tax & Identification</span>
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-1">Optional business tax identifier</p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-medium text-[var(--text-muted)]">Permanent Account Number (PAN)</label>
                <span className="text-[10px] text-[var(--text-muted)] font-mono bg-[var(--surface-raised)] px-2 py-0.5 rounded">Optional</span>
              </div>
              <input
                type="text"
                value={pan}
                onChange={(e) => setPan(e.target.value.toUpperCase().slice(0, 10))}
                placeholder="AAACA1234F"
                maxLength={10}
                className="w-full bg-[var(--surface-raised)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--text)] placeholder-[var(--text-muted)]/50 focus:outline-none focus:border-[var(--accent)] transition-colors font-mono tracking-wider"
              />
              <p className="text-[11px] text-[var(--text-muted)] mt-1">Format: 5 letters, 4 numbers, 1 letter (e.g. AAACA1234F).</p>
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-1/3 bg-[var(--surface-raised)] hover:bg-[var(--surface-high)] text-[var(--text)] font-semibold py-2.5 rounded-xl transition-all border border-[var(--border)] flex items-center justify-center space-x-2 text-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={() => { setErrorMsg(null); setStep(3); }}
                className="w-2/3 bg-[var(--accent)] hover:bg-[var(--accent-2)] text-[var(--on-accent)] font-semibold py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center space-x-2 text-sm"
              >
                <span>Continue to Staff</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: First Employee (Optional, Skippable) */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-[var(--text)] flex items-center space-x-2">
                    <UserPlus className="w-5 h-5 text-[var(--accent)]" />
                    <span>Add First Employee</span>
                  </h2>
                  <p className="text-xs text-[var(--text-muted)] mt-1">Optional. You can also add employees later.</p>
                </div>
                <span className="text-[10px] text-[var(--text-muted)] font-mono bg-[var(--surface-raised)] px-2 py-0.5 rounded">Optional</span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Employee Full Name</label>
                <input
                  type="text"
                  value={empName}
                  onChange={(e) => setEmpName(e.target.value)}
                  placeholder="e.g. Rajesh Sharma"
                  className="w-full bg-[var(--surface-raised)] border border-[var(--border)] rounded-xl px-4 py-2 text-sm text-[var(--text)] placeholder-[var(--text-muted)]/50 focus:outline-none focus:border-[var(--accent)] transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Mobile Number</label>
                  <input
                    type="tel"
                    value={empPhone}
                    onChange={(e) => setEmpPhone(e.target.value)}
                    placeholder="9876543210"
                    className="w-full bg-[var(--surface-raised)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-[var(--text)] placeholder-[var(--text-muted)]/50 focus:outline-none focus:border-[var(--accent)] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Employment Model</label>
                  <select
                    value={empType}
                    onChange={(e) => setEmpType(e.target.value as any)}
                    className="w-full bg-[var(--surface-raised)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-[var(--text)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                  >
                    <option value="monthly">Monthly Salaried</option>
                    <option value="daily">Daily Wage (Dihaadi)</option>
                    <option value="hourly">Hourly Operator</option>
                    <option value="contract">Contractor</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Department</label>
                  <input
                    type="text"
                    value={empDept}
                    onChange={(e) => setEmpDept(e.target.value)}
                    placeholder="e.g. Operations"
                    className="w-full bg-[var(--surface-raised)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-[var(--text)] placeholder-[var(--text-muted)]/50 focus:outline-none focus:border-[var(--accent)] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Designation</label>
                  <input
                    type="text"
                    value={empDesignation}
                    onChange={(e) => setEmpDesignation(e.target.value)}
                    placeholder="e.g. Site Supervisor"
                    className="w-full bg-[var(--surface-raised)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-[var(--text)] placeholder-[var(--text-muted)]/50 focus:outline-none focus:border-[var(--accent)] transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col space-y-2 pt-4">
              <button
                type="button"
                disabled={loading}
                onClick={() => handleSubmit(false)}
                className="w-full bg-[var(--accent)] hover:bg-[var(--accent-2)] text-[var(--on-accent)] font-semibold py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center space-x-2 text-sm disabled:opacity-50"
              >
                <span>{loading ? 'Creating Organization...' : empName.trim() ? 'Complete & Add Employee' : 'Finish & Go to Dashboard'}</span>
                <CheckCircle2 className="w-4 h-4" />
              </button>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-1/3 bg-[var(--surface-raised)] hover:bg-[var(--surface-high)] text-[var(--text)] font-semibold py-2 rounded-xl transition-all border border-[var(--border)] flex items-center justify-center space-x-2 text-xs"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleSubmit(true)}
                  className="w-2/3 bg-transparent hover:bg-[var(--surface-raised)] text-[var(--text-muted)] hover:text-[var(--text)] font-semibold py-2 rounded-xl transition-all border border-transparent hover:border-[var(--border)] text-xs"
                >
                  Skip Staff for now & Finish
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
