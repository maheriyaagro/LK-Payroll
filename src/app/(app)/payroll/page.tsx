"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronRight, HelpCircle, ArrowUpRight } from "lucide-react";
import {
  payrollMonths,
  payrollRecords,
  formatPaise,
} from "@/lib/mock";

export default function PayrollPage() {
  const [selectedMonth, setSelectedMonth] = useState("sep");
  const [isApproved, setIsApproved] = useState(false);

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
                style={{ backgroundColor: isApproved ? "var(--positive)" : "var(--accent)" }}
              />
              <p style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>
                September payroll — {isApproved ? "Approved" : "Draft"}
              </p>
            </div>
            <p className="text-caption mt-1" style={{ color: "var(--text-muted)" }}>
              {isApproved ? "Approved for disbursal on 1 Oct" : "23 of 28 attendances verified • Ready for sign-off"}
            </p>
          </div>

          <span
            className="text-caption px-2.5 py-1 rounded-full font-semibold"
            style={{
              backgroundColor: isApproved
                ? "color-mix(in srgb, var(--positive) 12%, transparent)"
                : "color-mix(in srgb, var(--accent) 12%, transparent)",
              color: isApproved ? "var(--positive)" : "var(--accent)",
            }}
          >
            {isApproved ? "Ready to Pay" : "Draft"}
          </span>
        </div>

        {/* Progress bar in var(--accent) */}
        <div className="flex flex-col gap-1.5 mt-1">
          <div className="flex justify-between text-caption font-medium" style={{ color: "var(--text-muted)" }}>
            <span>Verification progress</span>
            <span>{isApproved ? "100%" : "82%"}</span>
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
                width: isApproved ? "100%" : "82%",
                height: "100%",
                backgroundColor: isApproved ? "var(--positive)" : "var(--accent)",
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

          <button
            onClick={() => setIsApproved(!isApproved)}
            className="flex items-center gap-1.5 font-semibold transition-all active:scale-95 cursor-pointer"
            style={{
              height: 40,
              padding: "0 18px",
              borderRadius: "var(--radius-pill)",
              backgroundColor: isApproved ? "var(--surface-high)" : "var(--accent)",
              color: isApproved ? "var(--text)" : "#ffffff",
              fontSize: 13,
              boxShadow: isApproved ? "none" : "0 2px 10px rgba(254, 87, 51, 0.35)",
            }}
          >
            <CheckCircle2 size={16} />
            <span>{isApproved ? "Approved ✓" : "Review and approve"}</span>
          </button>
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
