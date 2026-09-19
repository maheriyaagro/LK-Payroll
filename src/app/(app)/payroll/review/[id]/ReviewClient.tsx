// src/app/(app)/payroll/review/[id]/ReviewClient.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Lock,
  RotateCcw,
  Users,
  CreditCard,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import type { PreRunCheckItem } from "@/server/preRunChecks";
import { transitionRunAction, reverseRunAction } from "@/app/actions/payroll";

interface Props {
  run: {
    id: string;
    period_month: string;
    status: "draft" | "review" | "approved" | "paid" | "reversed";
    locked_at: string | null;
    reversal_of_id?: string | null;
  };
  items: Array<{
    id: string;
    employee_id: string;
    gross_paise: string;
    deductions_paise: string;
    net_paise: string;
    days_paid: number;
    employee: {
      id: string;
      code: string;
      name: string;
      designation: string | null;
      employment_type: string;
      bank_account_masked: string | null;
    };
  }>;
  checks: PreRunCheckItem[];
  totals: {
    grossPaise: bigint;
    deductionsPaise: bigint;
    netPaise: bigint;
  };
}

export default function ReviewClient({ run, items, checks, totals }: Props) {
  const router = useRouter();

  const [acknowledgedCodes, setAcknowledgedCodes] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [reversalReason, setReversalReason] = useState("");
  const [showReversalModal, setShowReversalModal] = useState(false);

  const errors = checks.filter((c) => c.severity === "error");
  const warnings = checks.filter((c) => c.severity === "warning");

  const allWarningsAcknowledged =
    warnings.length === 0 || warnings.every((w) => acknowledgedCodes.has(w.code));
  const canApprove = errors.length === 0 && allWarningsAcknowledged;

  const toggleWarning = (code: string) => {
    const next = new Set(acknowledgedCodes);
    if (next.has(code)) {
      next.delete(code);
    } else {
      next.add(code);
    }
    setAcknowledgedCodes(next);
  };

  const acknowledgeAll = () => {
    if (acknowledgedCodes.size === warnings.length) {
      setAcknowledgedCodes(new Set());
    } else {
      setAcknowledgedCodes(new Set(warnings.map((w) => w.code)));
    }
  };

  const handleApprove = async () => {
    if (!canApprove) return;
    setIsSubmitting(true);
    setActionError(null);

    const res = await transitionRunAction(run.id, "approved", {
      acknowledgedWarningCodes: Array.from(acknowledgedCodes),
    });

    setIsSubmitting(false);
    if (!res.success) {
      setActionError(res.error || "Failed to approve payroll run.");
    } else {
      router.refresh();
    }
  };

  const handleMarkPaid = async () => {
    setIsSubmitting(true);
    setActionError(null);

    const res = await transitionRunAction(run.id, "paid");
    setIsSubmitting(false);

    if (!res.success) {
      setActionError(res.error || "Failed to mark run as paid.");
    } else {
      router.refresh();
    }
  };

  const handleReverse = async () => {
    setIsSubmitting(true);
    setActionError(null);

    const res = await reverseRunAction(run.id, reversalReason || "Manual owner reversal");
    setIsSubmitting(false);

    if (!res.success) {
      setActionError(res.error || "Failed to reverse run.");
    } else {
      setShowReversalModal(false);
      router.push("/payroll");
    }
  };

  const formatPaise = (p: bigint | string | number) => {
    const num = typeof p === "bigint" ? Number(p) : Number(p || 0);
    return `₹${(num / 100).toLocaleString("en-IN")}`;
  };

  return (
    <div className="flex flex-col gap-6 pt-2 pb-36 md:pb-16 max-w-5xl mx-auto">
      {/* ── 1. Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/payroll"
            className="flex items-center justify-center shrink-0 w-9 h-9 rounded-full transition-colors"
            style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
            aria-label="Back to payroll"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)" }}>
                Payroll Review: {run.period_month}
              </h1>
              <span
                className="text-caption px-2.5 py-0.5 rounded-full font-semibold capitalize"
                style={{
                  backgroundColor:
                    run.status === "approved" || run.status === "paid"
                      ? "color-mix(in srgb, var(--positive) 15%, transparent)"
                      : run.status === "reversed"
                      ? "color-mix(in srgb, var(--negative) 15%, transparent)"
                      : "color-mix(in srgb, var(--accent) 15%, transparent)",
                  color:
                    run.status === "approved" || run.status === "paid"
                      ? "var(--positive)"
                      : run.status === "reversed"
                      ? "var(--negative)"
                      : "var(--accent)",
                }}
              >
                {run.status}
              </span>
            </div>
            <p className="text-caption mt-0.5" style={{ color: "var(--text-muted)" }}>
              {run.locked_at ? `Locked on ${new Date(run.locked_at).toLocaleString()}` : "Unlocked draft run"}
              {run.reversal_of_id ? ` • Reversal of run ${run.reversal_of_id.slice(0, 8)}` : ""}
            </p>
          </div>
        </div>

        {/* Quick totals badge */}
        <div
          className="flex items-center gap-4 px-4 py-2 rounded-2xl self-start sm:self-auto"
          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <div>
            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>Total Net Payout</p>
            <p className="font-bold text-base tabular-nums" style={{ color: "var(--accent)" }}>
              {formatPaise(totals.netPaise)}
            </p>
          </div>
          <div className="w-[1px] h-8 bg-[var(--border)]" />
          <div>
            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>Employees</p>
            <p className="font-bold text-base" style={{ color: "var(--text)" }}>
              {items.length}
            </p>
          </div>
        </div>
      </div>

      {actionError && (
        <div
          className="p-4 rounded-xl text-sm font-medium whitespace-pre-line"
          style={{
            backgroundColor: "color-mix(in srgb, var(--negative) 12%, transparent)",
            color: "var(--negative)",
            border: "1px solid var(--negative)",
          }}
        >
          {actionError}
        </div>
      )}

      {/* ── 2. Pre-Run Checks Card (Top) ── */}
      <div
        className="flex flex-col gap-4 p-5 rounded-2xl"
        style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck size={20} style={{ color: errors.length > 0 ? "var(--negative)" : "var(--positive)" }} />
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>
              Pre-Run Automated Checks
            </h2>
          </div>
          <span
            className="text-caption px-2.5 py-1 rounded-full font-semibold"
            style={{
              backgroundColor: errors.length > 0 ? "rgba(254, 87, 51, 0.15)" : "rgba(46, 213, 115, 0.15)",
              color: errors.length > 0 ? "var(--negative)" : "var(--positive)",
            }}
          >
            {errors.length > 0 ? `${errors.length} Blocking Error(s)` : "All Checks Clear"}
          </span>
        </div>

        {/* Blocking Errors */}
        {errors.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-caption font-bold tracking-wide uppercase" style={{ color: "var(--negative)" }}>
              Blocking Errors (Must be resolved before approval)
            </p>
            <div className="flex flex-col gap-2">
              {errors.map((err, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 p-3 rounded-xl"
                  style={{
                    backgroundColor: "color-mix(in srgb, var(--negative) 10%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--negative) 30%, transparent)",
                  }}
                >
                  <AlertOctagon size={18} className="shrink-0 mt-0.5" style={{ color: "var(--negative)" }} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                      {err.message}
                    </p>
                    {err.employee && (
                      <p className="text-caption mt-0.5" style={{ color: "var(--text-muted)" }}>
                        Worker: {err.employee.name} ({err.employee.code})
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="flex flex-col gap-2 mt-2">
            <div className="flex items-center justify-between">
              <p className="text-caption font-bold tracking-wide uppercase" style={{ color: "#FACC15" }}>
                Compliance Warnings ({warnings.length}) — Acknowledgment Required
              </p>
              <button
                type="button"
                onClick={acknowledgeAll}
                className="text-caption font-semibold cursor-pointer underline text-[var(--text-muted)] hover:text-white"
              >
                {acknowledgedCodes.size === warnings.length ? "Deselect All" : "Acknowledge All"}
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {warnings.map((w, idx) => {
                const isChecked = acknowledgedCodes.has(w.code);
                return (
                  <label
                    key={idx}
                    className="flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all"
                    style={{
                      backgroundColor: isChecked ? "var(--surface-raised)" : "rgba(234, 179, 8, 0.08)",
                      border: isChecked
                        ? "1px solid var(--border)"
                        : "1px solid rgba(234, 179, 8, 0.3)",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleWarning(w.code)}
                      className="mt-1 w-4 h-4 rounded accent-[var(--accent)] cursor-pointer"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle size={15} style={{ color: "#FACC15" }} />
                        <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                          {w.message}
                        </p>
                      </div>
                      <p className="text-caption mt-0.5" style={{ color: "var(--text-muted)" }}>
                        Tick to acknowledge this variation before approving run
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* All Checks Passed Banner */}
        {errors.length === 0 && warnings.length === 0 && (
          <div
            className="flex items-center gap-3 p-3 rounded-xl"
            style={{
              backgroundColor: "color-mix(in srgb, var(--positive) 10%, transparent)",
              border: "1px solid color-mix(in srgb, var(--positive) 30%, transparent)",
            }}
          >
            <CheckCircle2 size={20} style={{ color: "var(--positive)" }} />
            <p className="text-sm font-medium" style={{ color: "var(--text)" }}>
              No attendance gaps, pay variations, or compliance warnings found. Ready for owner sign-off.
            </p>
          </div>
        )}
      </div>

      {/* ── 3. Employee Breakdown Table (Bottom) ── */}
      <div
        className="flex flex-col rounded-2xl overflow-hidden"
        style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={18} style={{ color: "var(--accent)" }} />
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>
              Employee Payroll Roster ({items.length})
            </h2>
          </div>
          <span className="text-caption" style={{ color: "var(--text-muted)" }}>
            Values in integer paise • Rounded half-up
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-caption text-[var(--text-muted)]">
                <th className="py-3 px-4 font-semibold">Worker</th>
                <th className="py-3 px-4 font-semibold">Type</th>
                <th className="py-3 px-4 font-semibold text-center">Days</th>
                <th className="py-3 px-4 font-semibold text-right">Gross</th>
                <th className="py-3 px-4 font-semibold text-right">Deductions</th>
                <th className="py-3 px-4 font-semibold text-right">Net Payout</th>
                <th className="py-3 px-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-[var(--surface-raised)] transition-colors">
                  <td className="py-3.5 px-4">
                    <p className="font-semibold text-[var(--text)]">{item.employee.name}</p>
                    <p className="text-caption text-[var(--text-muted)] font-mono">{item.employee.code}</p>
                  </td>
                  <td className="py-3.5 px-4 capitalize text-caption text-[var(--text-muted)]">
                    {item.employee.employment_type}
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono">{item.days_paid}</td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                    {formatPaise(item.gross_paise)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-[var(--negative)]">
                    {formatPaise(item.deductions_paise)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold tabular-nums text-[var(--positive)]">
                    {formatPaise(item.net_paise)}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <Link
                      href={`/payroll/${item.id}`}
                      className="inline-flex items-center gap-1 text-caption font-semibold text-[var(--accent)] hover:underline"
                    >
                      <span>Payslip</span>
                      <ChevronRight size={13} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 4. Sticky Lifecycle Actions ── */}
      <div
        className="sticky bottom-20 md:bottom-4 z-20 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl backdrop-blur-xl shadow-2xl"
        style={{
          backgroundColor: "rgba(22, 22, 24, 0.94)",
          border: "1px solid var(--border)",
        }}
      >
        <div>
          <p className="text-caption" style={{ color: "var(--text-muted)" }}>
            Current Run Status: <strong className="text-[var(--text)] capitalize">{run.status}</strong>
          </p>
          <p className="text-caption mt-0.5" style={{ color: "var(--text-muted)" }}>
            {run.status === "approved" || run.status === "paid"
              ? "Attendance for this month is permanently locked against edits."
              : errors.length > 0
              ? "Clear all errors above to unlock run approval."
              : "Ready to sign off."}
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Draft/Review: Approve button */}
          {(run.status === "draft" || run.status === "review") && (
            <button
              type="button"
              disabled={!canApprove || isSubmitting}
              onClick={handleApprove}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-3 rounded-full font-bold text-sm transition-transform active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              style={{
                backgroundColor: "var(--accent)",
                color: "#FFFFFF",
                boxShadow: canApprove ? "0 4px 16px rgba(254, 87, 51, 0.4)" : "none",
              }}
            >
              <CheckCircle2 size={18} />
              <span>{isSubmitting ? "Approving..." : "Approve Payroll Run"}</span>
            </button>
          )}

          {/* Approved: Mark Paid & Reverse */}
          {run.status === "approved" && (
            <>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleMarkPaid}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-3 rounded-full font-bold text-sm cursor-pointer"
                style={{ backgroundColor: "var(--positive)", color: "#FFFFFF" }}
              >
                <CreditCard size={18} />
                <span>{isSubmitting ? "Processing..." : "Mark as Paid"}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowReversalModal(true)}
                className="flex items-center gap-1.5 px-4 py-3 rounded-full text-caption font-semibold cursor-pointer text-[var(--negative)] hover:bg-[var(--surface-high)]"
                style={{ border: "1px solid var(--border)" }}
              >
                <RotateCcw size={15} />
                <span>Reverse Run</span>
              </button>
            </>
          )}

          {/* Paid: Reverse only */}
          {run.status === "paid" && (
            <button
              type="button"
              onClick={() => setShowReversalModal(true)}
              className="flex items-center gap-1.5 px-5 py-3 rounded-full text-sm font-semibold cursor-pointer text-[var(--negative)] hover:bg-[var(--surface-high)]"
              style={{ border: "1px solid var(--border)" }}
            >
              <RotateCcw size={16} />
              <span>Reverse Paid Run</span>
            </button>
          )}

          {/* Reversed: Read-only badge */}
          {run.status === "reversed" && (
            <span
              className="px-5 py-2.5 rounded-full text-sm font-bold"
              style={{ backgroundColor: "var(--surface-high)", color: "var(--text-muted)" }}
            >
              Reversed (Read-Only)
            </span>
          )}
        </div>
      </div>

      {/* ── 5. Reversal Confirmation Modal ── */}
      {showReversalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div
            className="flex flex-col gap-4 p-6 rounded-2xl max-w-md w-full"
            style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-center gap-3 text-[var(--negative)]">
              <RotateCcw size={24} />
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)" }}>
                Reverse Payroll Run?
              </h2>
            </div>

            <p className="text-caption text-[var(--text-muted)]">
              Reversal never deletes records. It generates a linked reversal run with negated entries for full accounting transparency.
            </p>

            <div className="flex flex-col gap-1.5">
              <label className="text-caption font-semibold text-[var(--text)]">
                Reason for Reversal
              </label>
              <input
                type="text"
                placeholder="e.g. Disputed attendance or wage revision"
                value={reversalReason}
                onChange={(e) => setReversalReason(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl text-sm outline-none bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--text)]"
              />
            </div>

            <div className="flex items-center justify-end gap-3 mt-2">
              <button
                type="button"
                onClick={() => setShowReversalModal(false)}
                className="px-4 py-2 rounded-full text-caption font-semibold text-[var(--text-muted)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleReverse}
                className="px-5 py-2 rounded-full text-caption font-bold bg-[var(--negative)] text-white cursor-pointer"
              >
                {isSubmitting ? "Reversing..." : "Confirm Reversal"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
