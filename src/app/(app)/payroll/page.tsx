"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronRight, HelpCircle, ArrowUpRight, ShieldCheck, Plus, RotateCcw, AlertTriangle } from "lucide-react";
import {
  payrollMonths,
  payrollRecords,
  formatPaise,
} from "@/lib/mock";
import { getRunForPeriodAction, createDraftAction } from "@/app/actions/payroll";

const PERIOD_MAP: Record<string, string> = {
  jun: "2026-06",
  jul: "2026-07",
  aug: "2026-08",
  sep: "2026-09",
};

export default function PayrollPage() {
  const router = useRouter();
  const [selectedMonth, setSelectedMonth] = useState("sep");
  const [activeRun, setActiveRun] = useState<any>(null);
  const [isLoadingRun, setIsLoadingRun] = useState(false);
  const [isCreatingDraft, setIsCreatingDraft] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const currentPeriod = PERIOD_MAP[selectedMonth] || "2026-09";
  const selectedMonthObj = payrollMonths.find((m) => m.key === selectedMonth) || payrollMonths[3];

  useEffect(() => {
    let isMounted = true;
    setIsLoadingRun(true);
    setCreateError(null);

    getRunForPeriodAction(currentPeriod).then((res) => {
      if (!isMounted) return;
      setIsLoadingRun(false);
      const runs = res.runs || [];
      // Pick active run: prefer non-reversed or the latest run
      const primaryRun = runs.find((r: any) => r.status !== "reversed") || runs[0] || null;
      setActiveRun(primaryRun);
    });

    return () => {
      isMounted = false;
    };
  }, [currentPeriod]);

  const handleCreateDraft = async () => {
    setIsCreatingDraft(true);
    setCreateError(null);
    const res = await createDraftAction(currentPeriod);
    setIsCreatingDraft(false);

    if (!res.success) {
      setCreateError(res.error || "Failed to create draft run.");
    } else if (res.runId) {
      router.push(`/payroll/review/${res.runId}`);
    }
  };

  const totalPayrollPaise = payrollRecords.reduce((acc, r) => acc + r.netPayPaise, 0);

  return (
    <div className="flex flex-col gap-4 pt-2 pb-24 md:pb-12">
      {/* ── 1. Month Selector Chip Row ── */}
      <div
        className="flex gap-2 overflow-x-auto pb-1"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {payrollMonths.map((m) => {
          const isSelected = m.key === selectedMonth;
          return (
            <button
              key={m.key}
              onClick={() => setSelectedMonth(m.key)}
              className="shrink-0 text-caption font-semibold transition-all cursor-pointer"
              style={{
                padding: "8px 18px",
                borderRadius: "var(--radius-pill)",
                backgroundColor: isSelected ? "var(--accent)" : "var(--surface)",
                color: isSelected ? "#ffffff" : "var(--text-muted)",
                boxShadow: isSelected ? "0 4px 12px rgba(254, 87, 51, 0.3)" : "none",
              }}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      {/* ── 2. Status Banner Card ── */}
      <div
        className="relative overflow-hidden flex flex-col gap-3"
        style={{
          backgroundColor: "var(--surface-raised)",
          borderRadius: "var(--radius-card)",
          padding: 20,
          border: "1px solid var(--border)",
        }}
      >
        {/* Subtle accent glow */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: -60,
            right: -60,
            width: 180,
            height: 180,
            borderRadius: "50%",
            background: "var(--accent)",
            opacity: 0.08,
            filter: "blur(50px)",
          }}
        />

        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  backgroundColor:
                    activeRun?.status === "approved" || activeRun?.status === "paid"
                      ? "var(--positive)"
                      : activeRun?.status === "reversed"
                      ? "var(--negative)"
                      : "var(--accent)",
                }}
              />
              <p style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>
                {selectedMonthObj.label} payroll —{" "}
                <span className="capitalize">
                  {activeRun ? activeRun.status : "Not Started"}
                </span>
              </p>
            </div>
            <p className="text-caption mt-1" style={{ color: "var(--text-muted)" }}>
              {activeRun?.status === "paid"
                ? "Payroll disbursed • Accounting records finalized"
                : activeRun?.status === "approved"
                ? `Approved & locked • Attendance locked for ${currentPeriod}`
                : activeRun?.status === "reversed"
                ? "Reversal run active • Original entries negated non-destructively"
                : activeRun
                ? "Draft generated • Pre-run automated checks ready"
                : `No run generated yet for ${selectedMonthObj.label}`}
            </p>
          </div>

          <span
            className="text-caption px-2.5 py-1 rounded-full font-semibold capitalize"
            style={{
              backgroundColor:
                activeRun?.status === "approved" || activeRun?.status === "paid"
                  ? "color-mix(in srgb, var(--positive) 12%, transparent)"
                  : activeRun?.status === "reversed"
                  ? "color-mix(in srgb, var(--negative) 12%, transparent)"
                  : "color-mix(in srgb, var(--accent) 12%, transparent)",
              color:
                activeRun?.status === "approved" || activeRun?.status === "paid"
                  ? "var(--positive)"
                  : activeRun?.status === "reversed"
                  ? "var(--negative)"
                  : "var(--accent)",
            }}
          >
            {activeRun ? activeRun.status : "Pending"}
          </span>
        </div>

        {createError && (
          <div
            className="p-3 rounded-xl text-caption font-medium text-[var(--negative)] bg-red-950/30 border border-[var(--negative)]"
          >
            {createError}
          </div>
        )}

        {/* Progress / Status Indicator */}
        <div className="flex flex-col gap-1.5 mt-1">
          <div className="flex justify-between text-caption font-medium" style={{ color: "var(--text-muted)" }}>
            <span>Run Lifecycle Stage</span>
            <span className="capitalize">
              {activeRun?.status === "paid"
                ? "4 of 4 (Paid)"
                : activeRun?.status === "approved"
                ? "3 of 4 (Approved)"
                : activeRun?.status === "review"
                ? "2 of 4 (Review)"
                : activeRun?.status === "reversed"
                ? "Reversed"
                : activeRun
                ? "1 of 4 (Draft)"
                : "0 of 4 (Not Started)"}
            </span>
          </div>
          <div
            className="w-full overflow-hidden"
            style={{
              height: 6,
              backgroundColor: "var(--surface-high)",
              borderRadius: "var(--radius-pill)",
            }}
          >
            <div
              className="transition-all duration-500"
              style={{
                width:
                  activeRun?.status === "paid"
                    ? "100%"
                    : activeRun?.status === "approved"
                    ? "75%"
                    : activeRun?.status === "review"
                    ? "50%"
                    : activeRun
                    ? "25%"
                    : "0%",
                height: "100%",
                backgroundColor:
                  activeRun?.status === "approved" || activeRun?.status === "paid"
                    ? "var(--positive)"
                    : activeRun?.status === "reversed"
                    ? "var(--negative)"
                    : "var(--accent)",
                borderRadius: "var(--radius-pill)",
              }}
            />
          </div>
        </div>

        {/* Amount + Action button row */}
        <div className="flex items-center justify-between gap-4 mt-2 pt-2" style={{ borderTop: "1px solid var(--border)" }}>
          <div>
            <p className="text-caption" style={{ color: "var(--text-muted)" }}>Total Net Payout</p>
            <p style={{ fontSize: 18, fontWeight: 700, color: "var(--text)" }} className="tabular-nums">
              {formatPaise(totalPayrollPaise)}
            </p>
          </div>

          {activeRun ? (
            <Link
              href={`/payroll/review/${activeRun.id}`}
              className="flex items-center gap-1.5 font-semibold px-5 py-2.5 rounded-full text-xs transition-all active:scale-95 cursor-pointer"
              style={{
                backgroundColor:
                  activeRun.status === "approved" || activeRun.status === "paid"
                    ? "var(--surface-high)"
                    : "var(--accent)",
                color: "#ffffff",
                boxShadow:
                  activeRun.status === "approved" || activeRun.status === "paid"
                    ? "none"
                    : "0 2px 10px rgba(254, 87, 51, 0.35)",
              }}
            >
              <ShieldCheck size={16} />
              <span>
                {activeRun.status === "approved"
                  ? "View Approved Run"
                  : activeRun.status === "paid"
                  ? "View Paid Run"
                  : activeRun.status === "reversed"
                  ? "View Reversal Run"
                  : "Review & Pre-Run Checks"}
              </span>
            </Link>
          ) : (
            <button
              onClick={handleCreateDraft}
              disabled={isCreatingDraft || isLoadingRun}
              className="flex items-center gap-1.5 font-semibold px-5 py-2.5 rounded-full text-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              style={{
                backgroundColor: "var(--accent)",
                color: "#ffffff",
                boxShadow: "0 2px 10px rgba(254, 87, 51, 0.35)",
              }}
            >
              <Plus size={16} />
              <span>{isCreatingDraft ? "Generating Run..." : "Create Draft Run"}</span>
            </button>
          )}
        </div>
      </div>

      {/* ── 3. List of Employees ── */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
          <p className="text-caption font-semibold" style={{ color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Employees ({payrollRecords.length})
          </p>
          <span className="text-caption" style={{ color: "var(--text-muted)" }}>
            Tap row for payslip
          </span>
        </div>

        <div className="flex flex-col gap-2">
          {payrollRecords.map((emp) => (
            <Link
              key={emp.id}
              href={`/payroll/${emp.id}`}
              className="flex items-center justify-between gap-3 transition-all hover:bg-opacity-80 active:scale-[0.99] group"
              style={{
                backgroundColor: "var(--surface)",
                borderRadius: "var(--radius-card)",
                padding: "14px 16px",
                border: "1px solid var(--border)",
              }}
            >
              {/* Left: Avatar + Name + Role & Days */}
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="flex items-center justify-center shrink-0"
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: "var(--radius-pill)",
                    backgroundColor: "var(--surface-high)",
                    color: "var(--text-muted)",
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  {emp.initials}
                </div>
                <div className="min-w-0">
                  <p
                    className="truncate font-semibold leading-tight group-hover:text-accent transition-colors"
                    style={{ fontSize: 15, color: "var(--text)" }}
                  >
                    {emp.name}
                  </p>
                  <p
                    className="text-caption truncate mt-0.5"
                    style={{ color: "var(--text-muted)", fontSize: 12 }}
                  >
                    {emp.role} • {emp.daysWorked}/{emp.totalDays} days
                  </p>
                </div>
              </div>

              {/* Right: Net pay in tabular-nums + "why?" link */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex flex-col items-end">
                  <span
                    className="font-bold tabular-nums leading-tight"
                    style={{ fontSize: 16, color: "var(--text)" }}
                  >
                    {formatPaise(emp.netPayPaise)}
                  </span>
                  <span
                    className="text-caption flex items-center gap-0.5 mt-0.5 group-hover:underline"
                    style={{
                      color: "var(--accent)",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    <span>why?</span>
                    <ArrowUpRight size={12} />
                  </span>
                </div>
                <ChevronRight size={16} style={{ color: "var(--text-muted)" }} className="opacity-60 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
