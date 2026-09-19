"use client";

import { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  AlertTriangle,
  Sparkles,
  Info,
  Calendar,
  Clock,
  Briefcase,
  HelpCircle,
  RefreshCw,
} from "lucide-react";
import {
  PayrollComparison,
  ComponentChange,
  ExplainerReason,
  comparePayroll,
  formatIndianCurrency,
} from "@/engine/compare";
import { EmployeePayroll } from "@/lib/mock";
import { PayrollResult, PayrollInput, Period } from "@/engine/types";

interface PayslipExplainerCardProps {
  employee: EmployeePayroll;
}

const REASON_CONFIG: Record<
  ExplainerReason,
  { label: string; bg: string; color: string; icon: any }
> = {
  "more or fewer paid days": {
    label: "Paid Days",
    bg: "color-mix(in srgb, var(--accent) 15%, transparent)",
    color: "var(--accent)",
    icon: Calendar,
  },
  lop: {
    label: "LOP",
    bg: "color-mix(in srgb, var(--negative) 15%, transparent)",
    color: "var(--negative)",
    icon: Clock,
  },
  ot_hours: {
    label: "OT Hours",
    bg: "color-mix(in srgb, #3b82f6 15%, transparent)",
    color: "#3b82f6",
    icon: Clock,
  },
  advance_recovery: {
    label: "Advance Recovery",
    bg: "color-mix(in srgb, #f59e0b 15%, transparent)",
    color: "#f59e0b",
    icon: Briefcase,
  },
  structure_change: {
    label: "Structure Change",
    bg: "color-mix(in srgb, #8b5cf6 15%, transparent)",
    color: "#8b5cf6",
    icon: Sparkles,
  },
  rule_pack_version_change: {
    label: "Rule Pack Change",
    bg: "color-mix(in srgb, #06b6d4 15%, transparent)",
    color: "#06b6d4",
    icon: Info,
  },
  new_joiner: {
    label: "New Joiner",
    bg: "color-mix(in srgb, var(--positive) 15%, transparent)",
    color: "var(--positive)",
    icon: Sparkles,
  },
  leaver: {
    label: "Leaver",
    bg: "color-mix(in srgb, var(--negative) 15%, transparent)",
    color: "var(--negative)",
    icon: Briefcase,
  },
  unexplained: {
    label: "Unexplained",
    bg: "color-mix(in srgb, #ef4444 20%, transparent)",
    color: "#ef4444",
    icon: HelpCircle,
  },
};

/**
 * Builds deterministic before & after comparison data for the given employee.
 */
function buildComparison(employee: EmployeePayroll, simulateAnomaly: boolean): PayrollComparison {
  const periodBefore: Period = {
    year: 2026,
    month: 8,
    daysInMonth: 31,
    startDate: "2026-08-01",
    endDate: "2026-08-31",
  };

  const periodAfter: Period = {
    year: 2026,
    month: 9,
    daysInMonth: 30,
    startDate: "2026-09-01",
    endDate: "2026-09-30",
  };

  // Convert employee mock data to engine lines
  const afterLines = [
    ...employee.earnings.map((e) => ({
      componentCode: e.label.toUpperCase().includes("BASIC")
        ? "BASIC"
        : e.label.toUpperCase().includes("DA")
        ? "DA"
        : e.label.toUpperCase().includes("OVERTIME")
        ? "OT"
        : e.label.toUpperCase().includes("BONUS")
        ? "ATTENDANCE_BONUS"
        : e.label.replace(/[^A-Z0-9]/gi, "_").toUpperCase(),
      label: e.label,
      kind: "earning" as const,
      amountPaise: BigInt(e.amountPaise),
      explain: `${e.label}: ₹${(e.amountPaise / 100).toFixed(2)}`,
    })),
    ...employee.deductions.map((d) => ({
      componentCode: d.label.toUpperCase().includes("EPF") || d.label.toUpperCase().includes("PF")
        ? "PF_EE"
        : d.label.toUpperCase().includes("ESIC")
        ? "ESI_EE"
        : d.label.toUpperCase().includes("ADVANCE")
        ? "ADV_REC"
        : d.label.toUpperCase().includes("PROFESSIONAL") || d.label.toUpperCase().includes("PT")
        ? "PT"
        : d.label.replace(/[^A-Z0-9]/gi, "_").toUpperCase(),
      label: d.label,
      kind: "deduction" as const,
      amountPaise: BigInt(d.amountPaise),
      explain: d.explainer || `${d.label}: ₹${(d.amountPaise / 100).toFixed(2)}`,
    })),
  ];

  // Derive August (previous month) baseline lines
  const beforeLines = afterLines.map((line) => {
    let beforeAmount = line.amountPaise;

    // Simulate realistic previous month variances
    if (line.componentCode === "OT") {
      // Last month had half the OT hours
      beforeAmount = (line.amountPaise * 4n) / 8n;
    } else if (line.componentCode === "ATTENDANCE_BONUS") {
      // Bonus was not awarded last month
      beforeAmount = 0n;
    } else if (line.componentCode === "ADV_REC") {
      // Advance was newly taken in September; August had ₹0 recovery
      beforeAmount = 0n;
    } else if (line.componentCode === "ESI_EE") {
      // Slightly lower ESI in August due to lower gross
      beforeAmount = (line.amountPaise * 95n) / 100n;
    }

    return {
      ...line,
      amountPaise: beforeAmount,
      explain: `${line.label}: ₹${(Number(beforeAmount) / 100).toFixed(2)}`,
    };
  });

  // Calculate totals
  const calcTotals = (lines: typeof afterLines) => {
    let gross = 0n;
    let ded = 0n;
    let adv = 0n;
    for (const l of lines) {
      if (l.kind === "earning") gross += l.amountPaise;
      if (l.kind === "deduction") {
        ded += l.amountPaise;
        if (l.componentCode === "ADV_REC") adv += l.amountPaise;
      }
    }
    return { gross, ded, adv, net: gross - ded };
  };

  const beforeTotals = calcTotals(beforeLines);
  let afterTotals = calcTotals(afterLines);

  // If simulating anomaly: inject an arbitrary bonus discrepancy with no matching trigger
  let evaluatedAfterLines = afterLines;
  if (simulateAnomaly) {
    evaluatedAfterLines = afterLines.map((l) =>
      l.componentCode === "BASIC"
        ? { ...l, amountPaise: l.amountPaise + 250000n } // +₹2,500 arbitrary variation
        : l
    );
    afterTotals = calcTotals(evaluatedAfterLines);
  }

  const lopDaysBefore = 0n;
  const lopDaysAfter = employee.daysWorked < employee.totalDays
    ? BigInt(employee.totalDays - employee.daysWorked) * 100n
    : 0n;

  const beforeResult: PayrollResult = {
    employeeId: employee.id,
    period: periodBefore,
    attendanceSummary: {
      totalDaysInPeriod: 31,
      payableCentiDays: 3100n,
      lopCentiDays: lopDaysBefore,
      workedMinutes: 26n * 8n * 60n,
      otMinutes: 240n, // 4 hrs in Aug
      weeklyOffCount: 5,
      holidayCount: 0,
      presentCount: 26,
      halfDayCount: 0,
      absentCount: 0,
      explain: "August standard attendance.",
    },
    lines: beforeLines,
    grossPaise: beforeTotals.gross,
    deductionsPaise: beforeTotals.ded,
    advanceRecoveries: [],
    totalAdvanceRecoveredPaise: beforeTotals.adv,
    netPaise: beforeTotals.net,
    explain: "August 2026 Payroll",
    warnings: [],
  };

  const afterResult: PayrollResult = {
    employeeId: employee.id,
    period: periodAfter,
    attendanceSummary: {
      totalDaysInPeriod: 30,
      payableCentiDays: BigInt(employee.daysWorked) * 100n,
      lopCentiDays: lopDaysAfter,
      workedMinutes: BigInt(employee.daysWorked) * 8n * 60n,
      otMinutes: 480n, // 8 hrs in Sep
      weeklyOffCount: 4,
      holidayCount: 0,
      presentCount: employee.daysWorked,
      halfDayCount: 0,
      absentCount: employee.totalDays - employee.daysWorked,
      explain: "September standard attendance.",
    },
    lines: evaluatedAfterLines,
    grossPaise: afterTotals.gross,
    deductionsPaise: afterTotals.ded,
    advanceRecoveries: [],
    totalAdvanceRecoveredPaise: afterTotals.adv,
    netPaise: afterTotals.net,
    explain: "September 2026 Payroll",
    warnings: [],
  };

  // Mock input structures to identify structure changes
  const beforeInput: PayrollInput = {
    employee: {
      id: employee.id,
      code: employee.empCode,
      name: employee.name,
      employmentType: "monthly",
      doj: "2025-01-01",
      isActive: true,
    },
    components: beforeLines
      .filter((l) => l.kind === "earning")
      .map((l) => ({
        code: l.componentCode,
        label: l.label,
        kind: "earning",
        calcType: "fixed",
        amountPaise: l.amountPaise,
      })),
    attendance: [],
    period: periodBefore,
  };

  const afterInput: PayrollInput = {
    employee: {
      id: employee.id,
      code: employee.empCode,
      name: employee.name,
      employmentType: "monthly",
      doj: "2025-01-01",
      isActive: true,
    },
    components: (simulateAnomaly ? beforeLines : afterLines)
      .filter((l) => l.kind === "earning")
      .map((l) => ({
        code: l.componentCode,
        label: l.label,
        kind: "earning",
        calcType: "fixed",
        amountPaise: l.amountPaise,
      })),
    attendance: [],
    period: periodAfter,
  };

  return comparePayroll(beforeResult, afterResult, beforeInput, afterInput);
}

export function PayslipExplainerCard({ employee }: PayslipExplainerCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [simulateAnomaly, setSimulateAnomaly] = useState(false);

  const comparison = buildComparison(employee, simulateAnomaly);
  const { netDeltaPaise, changes, hasUnexplained, unexplainedCount } = comparison;

  const isNetPositive = netDeltaPaise > 0n;
  const isNetNegative = netDeltaPaise < 0n;
  const netZero = netDeltaPaise === 0n;

  const topChanges = changes.slice(0, 3);
  const remainingChanges = changes.slice(3);

  return (
    <div
      className="flex flex-col overflow-hidden transition-all duration-200"
      style={{
        backgroundColor: "var(--surface)",
        borderRadius: "var(--radius-card)",
        border: hasUnexplained
          ? "1px solid color-mix(in srgb, #ef4444 50%, var(--border))"
          : "1px solid var(--border)",
        boxShadow: hasUnexplained
          ? "0 4px 20px -2px rgba(239, 68, 68, 0.12)"
          : "none",
      }}
    >
      {/* ── Card Header ── */}
      <div
        className="px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-3"
        style={{
          borderBottom: "1px solid var(--border)",
          backgroundColor: hasUnexplained
            ? "color-mix(in srgb, #ef4444 6%, var(--surface-raised))"
            : "var(--surface-raised)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center shrink-0 w-10 h-10 rounded-full"
            style={{
              backgroundColor: isNetPositive
                ? "color-mix(in srgb, var(--positive) 15%, transparent)"
                : isNetNegative
                ? "color-mix(in srgb, var(--negative) 15%, transparent)"
                : "var(--surface-high)",
              color: isNetPositive
                ? "var(--positive)"
                : isNetNegative
                ? "var(--negative)"
                : "var(--text-muted)",
            }}
          >
            {isNetPositive ? (
              <TrendingUp size={20} />
            ) : isNetNegative ? (
              <TrendingDown size={20} />
            ) : null}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: "var(--text)",
                }}
              >
                {netZero
                  ? "Take-home unchanged since last month"
                  : `Take-home changed by ${isNetPositive ? "+" : ""}${formatIndianCurrency(
                      netDeltaPaise
                    )} since last month`}
              </h2>

              {hasUnexplained && (
                <span
                  className="inline-flex items-center gap-1 text-caption px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider"
                  style={{
                    backgroundColor: "color-mix(in srgb, #ef4444 20%, transparent)",
                    color: "#ef4444",
                    fontSize: 11,
                  }}
                >
                  <AlertTriangle size={12} />
                  <span>Review Required ({unexplainedCount} Unexplained)</span>
                </span>
              )}
            </div>

            <p
              className="text-caption mt-0.5 flex items-center gap-1.5"
              style={{ color: "var(--text-muted)", fontSize: 12 }}
            >
              <span>Deterministic breakdown vs Aug 2026</span>
              <span>•</span>
              <span>Zero LLM / 100% Rule-Derived</span>
            </p>
          </div>
        </div>

        {/* Manager Anomaly Simulation Toggle */}
        <button
          onClick={() => setSimulateAnomaly((v) => !v)}
          className="self-start md:self-auto text-caption font-semibold px-2.5 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          style={{
            backgroundColor: simulateAnomaly
              ? "color-mix(in srgb, #ef4444 15%, transparent)"
              : "var(--surface-high)",
            color: simulateAnomaly ? "#ef4444" : "var(--text-muted)",
            border: "1px solid var(--border)",
            fontSize: 11,
          }}
          title="Toggle simulated anomaly to test unexplained variation surfacing"
        >
          <RefreshCw size={12} className={simulateAnomaly ? "animate-spin" : ""} />
          <span>{simulateAnomaly ? "Reset Clean State" : "Simulate Anomaly"}</span>
        </button>
      </div>

      {/* ── Unexplained Warning Banner (Surfaced directly to manager) ── */}
      {hasUnexplained && (
        <div
          className="px-5 py-3 flex items-start gap-2.5"
          style={{
            backgroundColor: "color-mix(in srgb, #ef4444 10%, transparent)",
            borderBottom: "1px solid color-mix(in srgb, #ef4444 30%, transparent)",
          }}
        >
          <AlertTriangle size={16} className="shrink-0 mt-0.5" style={{ color: "#ef4444" }} />
          <div className="text-caption">
            <p className="font-bold" style={{ color: "#ef4444" }}>
              Unexplained Variation Detected
            </p>
            <p style={{ color: "var(--text)" }}>
              One or more salary lines varied without a recorded attendance, advance recovery, or structure change trigger.
              Please inspect the flagged item below before finalizing payment.
            </p>
          </div>
        </div>
      )}

      {/* ── Top 3 Reasons Rows ── */}
      <div className="divide-y divide-[var(--border)]">
        {topChanges.map((change) => (
          <ChangeRow key={change.componentCode} change={change} />
        ))}

        {/* ── Expandable Drawer for Remaining Changes ── */}
        {expanded &&
          remainingChanges.map((change) => (
            <ChangeRow key={change.componentCode} change={change} isRemaining />
          ))}
      </div>

      {/* ── Expand/Collapse Drawer Button (if > 3 changes) ── */}
      {remainingChanges.length > 0 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full px-5 py-3 flex items-center justify-center gap-1.5 text-caption font-semibold transition-colors hover:bg-[var(--surface-raised)] cursor-pointer"
          style={{
            borderTop: "1px solid var(--border)",
            color: "var(--accent)",
            backgroundColor: "var(--surface)",
            fontSize: 13,
          }}
        >
          <span>
            {expanded
              ? "Show top 3 reasons only"
              : `Tap to expand ${remainingChanges.length} other change${
                  remainingChanges.length > 1 ? "s" : ""
                }`}
          </span>
          <ChevronDown
            size={16}
            className="transition-transform duration-200"
            style={{
              transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            }}
          />
        </button>
      )}
    </div>
  );
}

interface ChangeRowProps {
  change: ComponentChange;
  isRemaining?: boolean;
}

function ChangeRow({ change, isRemaining }: ChangeRowProps) {
  const config = REASON_CONFIG[change.reason] || REASON_CONFIG.unexplained;
  const isPositive = change.deltaPaise > 0n;
  const isNegative = change.deltaPaise < 0n;

  return (
    <div
      className="px-5 py-3.5 flex flex-col gap-1.5 transition-colors hover:bg-[var(--surface-raised)]"
      style={{
        backgroundColor: change.reason === "unexplained"
          ? "color-mix(in srgb, #ef4444 6%, transparent)"
          : isRemaining
          ? "color-mix(in srgb, var(--surface-high) 50%, transparent)"
          : "transparent",
      }}
    >
      <div className="flex items-center justify-between gap-3">
        {/* Left: Component name and Reason Badge */}
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="font-medium"
            style={{
              color: "var(--text)",
              fontSize: 14,
            }}
          >
            {change.label}
          </span>

          <span
            className="inline-flex items-center gap-1 text-caption px-2 py-0.5 rounded-full font-semibold"
            style={{
              backgroundColor: config.bg,
              color: config.color,
              fontSize: 11,
            }}
          >
            <config.icon size={11} />
            <span>{config.label}</span>
          </span>
        </div>

        {/* Right: Delta Amount */}
        <span
          className="font-bold tabular-nums shrink-0"
          style={{
            fontSize: 14,
            color:
              change.reason === "unexplained"
                ? "#ef4444"
                : isPositive
                ? "var(--positive)"
                : isNegative
                ? "var(--negative)"
                : "var(--text-muted)",
          }}
        >
          {isPositive ? "+" : ""}
          {formatIndianCurrency(change.deltaPaise)}
        </span>
      </div>

      {/* Explanation Sentence */}
      <p
        className="text-caption leading-relaxed"
        style={{
          color: change.reason === "unexplained" ? "#ef4444" : "var(--text-muted)",
          fontSize: 12,
        }}
      >
        {change.explain}
      </p>
    </div>
  );
}
