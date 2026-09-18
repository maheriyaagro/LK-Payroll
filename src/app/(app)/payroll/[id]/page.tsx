"use client";

import { useState, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronDown,
  Info,
  Share2,
  Download,
  Building2,
  Calendar,
  CheckCircle2,
  MessageCircle,
} from "lucide-react";
import {
  payrollRecords,
  formatPaise,
  type EmployeePayroll,
} from "@/lib/mock";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function PayslipDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const employeeId = resolvedParams.id;

  // Find employee or fallback to the first record
  const employee: EmployeePayroll =
    payrollRecords.find((r) => r.id === employeeId) || payrollRecords[0];

  // State to track which deduction explainers are expanded (first expanded by default)
  const [expandedDeductions, setExpandedDeductions] = useState<Record<string, boolean>>({
    [employee.deductions[0]?.id || "d1"]: true,
  });

  const toggleDeduction = (id: string) => {
    setExpandedDeductions((prev: Record<string, boolean>) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const totalEarningsPaise = employee.earnings.reduce((acc, e) => acc + e.amountPaise, 0);
  const totalDeductionsPaise = employee.deductions.reduce((acc, d) => acc + d.amountPaise, 0);

  return (
    <div className="flex flex-col gap-5 pt-2 pb-24 md:pb-12 max-w-6xl mx-auto">
      {/* ── 1. Navigation & Header ── */}
      <div className="flex flex-col gap-3">
        <Link
          href="/payroll"
          className="inline-flex items-center gap-1.5 text-caption font-semibold transition-colors hover:text-accent w-fit"
          style={{ color: "var(--text-muted)" }}
        >
          <ArrowLeft size={16} />
          <span>Back to Payroll</span>
        </Link>

        {/* Employee Header */}
        <div
          className="flex items-center justify-between gap-4"
          style={{
            backgroundColor: "var(--surface)",
            borderRadius: "var(--radius-card)",
            padding: "16px 20px",
            border: "1px solid var(--border)",
          }}
        >
          <div className="flex items-center gap-3.5">
            <div
              className="flex items-center justify-center shrink-0 font-bold"
              style={{
                width: 48,
                height: 48,
                borderRadius: "var(--radius-pill)",
                backgroundColor: "var(--surface-high)",
                color: "var(--text)",
                fontSize: 16,
              }}
            >
              {employee.initials}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)" }}>
                  {employee.name}
                </h1>
                <span
                  className="text-caption px-2 py-0.5 rounded-full font-semibold"
                  style={{
                    backgroundColor: "var(--surface-high)",
                    color: "var(--text-muted)",
                    fontSize: 11,
                  }}
                >
                  {employee.empCode}
                </span>
              </div>
              <p className="text-caption mt-0.5" style={{ color: "var(--text-muted)" }}>
                {employee.role} • 26 days payable • Sep 2026
              </p>
            </div>
          </div>

          <span
            className="text-caption px-3 py-1 rounded-full font-semibold shrink-0"
            style={{
              backgroundColor: "color-mix(in srgb, var(--positive) 12%, transparent)",
              color: "var(--positive)",
            }}
          >
            Verified Draft
          </span>
        </div>
      </div>

      {/* ── 2. Responsive Layout (Breakdown on Left, Sticky Summary on Right at lg:) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ── Left Column: Breakdown List ── */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          {/* Mobile Net Pay Card (shown here on mobile, right column on desktop) */}
          <div
            className="lg:hidden relative overflow-hidden flex flex-col gap-2"
            style={{
              backgroundColor: "var(--surface-raised)",
              borderRadius: "var(--radius-card)",
              padding: 22,
              border: "1px solid var(--border)",
            }}
          >
            <div
              className="absolute pointer-events-none"
              style={{
                top: -50,
                right: -50,
                width: 160,
                height: 160,
                borderRadius: "50%",
                background: "var(--accent)",
                opacity: 0.1,
                filter: "blur(40px)",
              }}
            />
            <p className="text-caption font-semibold" style={{ color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Total Net Payable
            </p>
            <p className="text-display mt-0.5 tabular-nums">
              {formatPaise(employee.netPayPaise)}
            </p>
            <div className="flex items-center gap-2 mt-1 text-caption" style={{ color: "var(--text-muted)" }}>
              <Building2 size={14} />
              <span>A/C: {employee.bankAccount} ({employee.ifsc})</span>
            </div>
          </div>

          {/* Earnings Section */}
          <div
            className="flex flex-col"
            style={{
              backgroundColor: "var(--surface)",
              borderRadius: "var(--radius-card)",
              border: "1px solid var(--border)",
              overflow: "hidden",
            }}
          >
            <div
              className="px-5 py-3.5 flex items-center justify-between"
              style={{
                borderBottom: "1px solid var(--border)",
                backgroundColor: "var(--surface-raised)",
              }}
            >
              <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>
                Earnings
              </h2>
              <span className="text-caption font-semibold" style={{ color: "var(--positive)" }}>
                + Additions
              </span>
            </div>

            <div className="divide-y divide-[var(--border)]">
              {employee.earnings.map((item) => (
                <div key={item.id} className="px-5 py-3 flex items-center justify-between text-caption">
                  <span style={{ color: "var(--text)", fontSize: 14 }}>{item.label}</span>
                  <span className="font-semibold tabular-nums" style={{ color: "var(--text)", fontSize: 14 }}>
                    {formatPaise(item.amountPaise)}
                  </span>
                </div>
              ))}

              {/* Running subtotal row in var(--accent) */}
              <div
                className="px-5 py-3.5 flex items-center justify-between font-bold"
                style={{
                  backgroundColor: "var(--surface-raised)",
                  color: "var(--accent)",
                }}
              >
                <span style={{ fontSize: 14 }}>Total Earnings</span>
                <span className="tabular-nums" style={{ fontSize: 16 }}>
                  {formatPaise(totalEarningsPaise)}
                </span>
              </div>
            </div>
          </div>

          {/* Deductions Section with Expandable Plain-Language Explainers */}
          <div
            className="flex flex-col"
            style={{
              backgroundColor: "var(--surface)",
              borderRadius: "var(--radius-card)",
              border: "1px solid var(--border)",
              overflow: "hidden",
            }}
          >
            <div
              className="px-5 py-3.5 flex items-center justify-between"
              style={{
                borderBottom: "1px solid var(--border)",
                backgroundColor: "var(--surface-raised)",
              }}
            >
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>
                  Deductions
                </h2>
                <p className="text-caption mt-0.5" style={{ color: "var(--text-muted)", fontSize: 12 }}>
                  Tap any item to see how it was calculated
                </p>
              </div>
              <span className="text-caption font-semibold" style={{ color: "var(--negative)" }}>
                - Deductions
              </span>
            </div>

            <div className="divide-y divide-[var(--border)]">
              {employee.deductions.map((item) => {
                const isExpanded = !!expandedDeductions[item.id];

                return (
                  <div key={item.id} className="flex flex-col">
                    {/* Tappable deduction header row */}
                    <button
                      onClick={() => toggleDeduction(item.id)}
                      className="w-full px-5 py-3.5 flex items-center justify-between text-left transition-colors hover:bg-[var(--surface-raised)] cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className="flex items-center justify-center shrink-0 transition-transform duration-200"
                          style={{
                            color: isExpanded ? "var(--accent)" : "var(--text-muted)",
                            transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                          }}
                        >
                          <ChevronDown size={16} />
                        </span>
                        <span style={{ color: "var(--text)", fontSize: 14, fontWeight: isExpanded ? 600 : 400 }}>
                          {item.label}
                        </span>
                      </div>

                      <span className="font-semibold tabular-nums" style={{ color: "var(--negative)", fontSize: 14 }}>
                        -{formatPaise(item.amountPaise)}
                      </span>
                    </button>

                    {/* Expandable Plain-Language Explainer — Given generous room */}
                    {isExpanded && item.explainer && (
                      <div
                        className="px-5 pb-4 pt-1 flex flex-col animate-fadeIn"
                        style={{ backgroundColor: "var(--surface-raised)" }}
                      >
                        <div
                          className="flex items-start gap-3 p-3.5 rounded-xl border"
                          style={{
                            backgroundColor: "var(--surface-high)",
                            borderColor: "var(--border)",
                          }}
                        >
                          <span
                            className="mt-0.5 shrink-0 flex items-center justify-center w-5 h-5 rounded-full"
                            style={{
                              backgroundColor: "var(--accent-soft)",
                              color: "var(--accent)",
                            }}
                          >
                            <Info size={13} />
                          </span>
                          <div className="flex-1">
                            <p
                              className="text-caption uppercase font-bold tracking-wide"
                              style={{ color: "var(--accent)", fontSize: 11 }}
                            >
                              Calculation Explainer
                            </p>
                            <p
                              className="mt-1 leading-relaxed"
                              style={{
                                color: "var(--text)",
                                fontSize: 13,
                                fontWeight: 500,
                              }}
                            >
                              {item.explainer}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Running subtotal row in var(--accent) */}
              <div
                className="px-5 py-3.5 flex items-center justify-between font-bold"
                style={{
                  backgroundColor: "var(--surface-raised)",
                  color: "var(--accent)",
                }}
              >
                <span style={{ fontSize: 14 }}>Total Deductions</span>
                <span className="tabular-nums" style={{ fontSize: 16 }}>
                  -{formatPaise(totalDeductionsPaise)}
                </span>
              </div>
            </div>
          </div>

          {/* Mobile Bottom Action Row */}
          <div className="flex flex-col gap-3 lg:hidden pt-2">
            <button
              onClick={() => alert(`Sharing payslip for ${employee.name} via WhatsApp`)}
              className="w-full flex items-center justify-center gap-2 font-semibold cursor-pointer active:scale-[0.99] transition-all"
              style={{
                height: 48,
                borderRadius: "var(--radius-pill)",
                backgroundColor: "var(--accent)",
                color: "#ffffff",
                fontSize: 15,
                boxShadow: "0 2px 10px rgba(254, 87, 51, 0.35)",
              }}
            >
              <MessageCircle size={18} />
              <span>Share on WhatsApp</span>
            </button>

            <button
              onClick={() => alert(`Downloading PDF payslip for ${employee.name}`)}
              className="w-full flex items-center justify-center gap-2 font-semibold cursor-pointer active:scale-[0.99] transition-all"
              style={{
                height: 48,
                borderRadius: "var(--radius-pill)",
                backgroundColor: "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--text)",
                fontSize: 15,
              }}
            >
              <Download size={18} />
              <span>Download PDF</span>
            </button>
          </div>
        </div>

        {/* ── Right Column: Desktop Sticky Summary Card (Hidden on Mobile) ── */}
        <div className="hidden lg:block lg:col-span-5 lg:sticky lg:top-6 flex flex-col gap-4">
          <div
            className="relative overflow-hidden flex flex-col gap-4"
            style={{
              backgroundColor: "var(--surface-raised)",
              borderRadius: "var(--radius-card)",
              padding: 24,
              border: "1px solid var(--border)",
            }}
          >
            {/* Accent blob */}
            <div
              className="absolute pointer-events-none"
              style={{
                top: -60,
                right: -60,
                width: 200,
                height: 200,
                borderRadius: "50%",
                background: "var(--accent)",
                opacity: 0.1,
                filter: "blur(50px)",
              }}
            />

            <div>
              <p className="text-caption font-semibold" style={{ color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Net Payable Amount
              </p>
              <p className="text-display mt-1 tabular-nums">
                {formatPaise(employee.netPayPaise)}
              </p>
            </div>

            {/* Quick summary calculation */}
            <div
              className="p-3.5 rounded-xl flex flex-col gap-2 text-caption"
              style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <div className="flex justify-between">
                <span style={{ color: "var(--text-muted)" }}>Gross Earnings</span>
                <span className="font-semibold tabular-nums" style={{ color: "var(--positive)" }}>
                  +{formatPaise(totalEarningsPaise)}
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: "var(--text-muted)" }}>Total Deductions</span>
                <span className="font-semibold tabular-nums" style={{ color: "var(--negative)" }}>
                  -{formatPaise(totalDeductionsPaise)}
                </span>
              </div>
              <div className="pt-2 flex justify-between font-bold" style={{ borderTop: "1px solid var(--border)" }}>
                <span style={{ color: "var(--text)" }}>Take Home Pay</span>
                <span className="tabular-nums" style={{ color: "var(--accent)" }}>
                  {formatPaise(employee.netPayPaise)}
                </span>
              </div>
            </div>

            {/* Bank details */}
            <div className="flex flex-col gap-1 text-caption" style={{ color: "var(--text-muted)" }}>
              <div className="flex items-center gap-2">
                <Building2 size={14} />
                <span>Bank Account: <strong style={{ color: "var(--text)" }}>{employee.bankAccount}</strong></span>
              </div>
              <p className="pl-5">IFSC Code: {employee.ifsc}</p>
              <p className="pl-5">Mode: Direct NEFT / IMPS Salary Batch</p>
            </div>

            {/* Desktop Action Buttons */}
            <div className="flex flex-col gap-2.5 pt-2">
              <button
                onClick={() => alert(`Sharing payslip for ${employee.name} via WhatsApp`)}
                className="w-full flex items-center justify-center gap-2 font-semibold cursor-pointer active:scale-[0.99] transition-all"
                style={{
                  height: 44,
                  borderRadius: "var(--radius-pill)",
                  backgroundColor: "var(--accent)",
                  color: "#ffffff",
                  fontSize: 14,
                  boxShadow: "0 2px 10px rgba(254, 87, 51, 0.35)",
                }}
              >
                <MessageCircle size={17} />
                <span>Share on WhatsApp</span>
              </button>

              <button
                onClick={() => alert(`Downloading PDF payslip for ${employee.name}`)}
                className="w-full flex items-center justify-center gap-2 font-semibold cursor-pointer active:scale-[0.99] transition-all"
                style={{
                  height: 44,
                  borderRadius: "var(--radius-pill)",
                  backgroundColor: "var(--surface)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                  fontSize: 14,
                }}
              >
                <Download size={17} />
                <span>Download PDF</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
