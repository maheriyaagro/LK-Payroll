import Link from "next/link";
import { TrendingUp, ChevronDown } from "lucide-react";
import { homeStats, formatPaise } from "@/lib/mock";

export default function HeroCard() {
  return (
    <div
      className="relative overflow-hidden text-white"
      style={{
        background: "linear-gradient(135deg, #18191E 0%, #0F1013 100%)",
        borderRadius: "var(--radius-card)",
        padding: 24,
        boxShadow: "0 14px 36px -8px rgba(0, 0, 0, 0.25), 0 4px 12px -2px rgba(0, 0, 0, 0.15)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
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
          opacity: 0.14,
          filter: "blur(60px)",
        }}
      />

      {/* Period dropdown chip */}
      <button
        className="absolute flex items-center gap-1 cursor-pointer transition-colors hover:bg-white/20"
        style={{
          top: 20,
          right: 20,
          padding: "6px 14px",
          borderRadius: "var(--radius-pill)",
          backgroundColor: "rgba(255, 255, 255, 0.12)",
          color: "rgba(255, 255, 255, 0.9)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          fontSize: 12,
          fontWeight: 500,
        }}
      >
        Monthly
        <ChevronDown size={14} />
      </button>

      {/* Label */}
      <p className="text-caption" style={{ color: "rgba(255, 255, 255, 0.65)" }}>
        This month&apos;s payroll
      </p>

      {/* Amount */}
      <p className="text-display mt-1 text-white">
        {formatPaise(homeStats.monthlyPayrollPaise)}
      </p>

      {/* Delta pill */}
      <span
        className="inline-flex items-center gap-1 mt-2"
        style={{
          padding: "4px 10px",
          borderRadius: "var(--radius-pill)",
          backgroundColor: "rgba(16, 185, 129, 0.2)",
          color: "#34D399",
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        <TrendingUp size={14} />
        +{homeStats.payrollDeltaPercent}%
      </span>

      {/* Action buttons */}
      <div className="flex gap-3 mt-5">
        <Link
          href="/punch"
          className="flex-1 flex items-center justify-center transition-transform active:scale-95 shadow-lg"
          style={{
            height: 48,
            borderRadius: "var(--radius-pill)",
            backgroundColor: "var(--accent)",
            color: "#FFFFFF",
            fontSize: 15,
            fontWeight: 600,
            boxShadow: "0 4px 16px rgba(254, 87, 51, 0.4)",
          }}
        >
          Mark hajri
        </Link>
        <Link
          href="/payroll"
          className="flex-1 flex items-center justify-center transition-transform active:scale-95 hover:bg-white/15"
          style={{
            height: 48,
            borderRadius: "var(--radius-pill)",
            backgroundColor: "rgba(255, 255, 255, 0.12)",
            color: "#FFFFFF",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            fontSize: 15,
            fontWeight: 600,
          }}
        >
          Run payroll
        </Link>
      </div>
    </div>
  );
}
