import type { ReactNode } from "react";

interface StatCardProps {
  icon: ReactNode;
  value: string;
  label: string;
}

export default function StatCard({ icon, value, label }: StatCardProps) {
  return (
    <div
      className="flex flex-col gap-2"
      style={{
        backgroundColor: "var(--surface)",
        borderRadius: "var(--radius-card)",
        padding: 16,
      }}
    >
      <span
        className="flex items-center justify-center"
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          backgroundColor: "var(--surface-high)",
          color: "var(--text-muted)",
        }}
      >
        {icon}
      </span>
      <p style={{ fontSize: 20, fontWeight: 600, color: "var(--text)" }}>
        {value}
      </p>
      <p className="text-caption" style={{ color: "var(--text-muted)" }}>
        {label}
      </p>
    </div>
  );
}
