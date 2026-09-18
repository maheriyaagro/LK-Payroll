import { TrendingUp, ChevronDown } from "lucide-react";
import { homeStats, formatPaise } from "@/lib/mock";

export default function HeroCard() {
  return (
    <div
      className="relative overflow-hidden"
      style={{
        backgroundColor: "var(--surface-raised)",
        borderRadius: "var(--radius-card)",
        padding: 24,
      }}
    >
      {/* Soft accent blob top-right */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: -80,
          right: -80,
          width: 240,
          height: 240,
          borderRadius: "50%",
          background: "var(--accent)",
          opacity: 0.08,
          filter: "blur(60px)",
        }}
      />

      {/* Period dropdown chip */}
      <button
        className="absolute flex items-center gap-1"
        style={{
          top: 20,
          right: 20,
          padding: "6px 12px",
          borderRadius: "var(--radius-pill)",
          backgroundColor: "var(--surface-high)",
          color: "var(--text-muted)",
          fontSize: 12,
          fontWeight: 500,
        }}
      >
        Monthly
        <ChevronDown size={14} />
      </button>

      {/* Label */}
      <p className="text-caption" style={{ color: "var(--text-muted)" }}>
        This month&apos;s payroll
      </p>

      {/* Amount */}
      <p className="text-display mt-1">
        {formatPaise(homeStats.monthlyPayrollPaise)}
      </p>

      {/* Delta pill */}
      <span
        className="inline-flex items-center gap-1 mt-2"
        style={{
          padding: "4px 10px",
          borderRadius: "var(--radius-pill)",
          backgroundColor:
            "color-mix(in srgb, var(--positive) 12%, transparent)",
          color: "var(--positive)",
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        <TrendingUp size={14} />
        +{homeStats.payrollDeltaPercent}%
      </span>

      {/* Action buttons */}
      <div className="flex gap-3 mt-5">
        <button
          className="flex-1 flex items-center justify-center"
          style={{
            height: 48,
            borderRadius: "var(--radius-pill)",
            backgroundColor: "var(--accent)",
            color: "var(--on-accent)",
            fontSize: 15,
            fontWeight: 600,
          }}
        >
          Mark hajri
        </button>
        <button
          className="flex-1 flex items-center justify-center"
          style={{
            height: 48,
            borderRadius: "var(--radius-pill)",
            backgroundColor: "var(--surface-high)",
            color: "var(--on-accent)",
            fontSize: 15,
            fontWeight: 600,
          }}
        >
          Run payroll
        </button>
      </div>
    </div>
  );
}
