"use client";

import { useState } from "react";
import { Bell, Users, Banknote } from "lucide-react";
import HeroCard from "@/components/home/HeroCard";
import StatCard from "@/components/home/StatCard";
import EmployeeList from "@/components/home/EmployeeList";
import {
  employees,
  homeStats,
  formatPaise,
  attendanceTabs,
  type AttendanceTab,
} from "@/lib/mock";

export default function HomePage() {
  const [tab, setTab] = useState<AttendanceTab>("today");

  const filtered =
    tab === "today"
      ? employees
      : employees.filter((e) => e.status === tab);

  return (
    <div className="flex flex-col gap-4 pb-4 pt-3 md:pt-6">
      {/* ── Greeting row ── */}
      <div className="flex items-center gap-3">
        <div
          className="flex items-center justify-center shrink-0"
          style={{
            width: 44,
            height: 44,
            borderRadius: "var(--radius-pill)",
            backgroundColor: "var(--surface-high)",
            color: "var(--text-muted)",
            fontSize: 15,
            fontWeight: 600,
          }}
        >
          U
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-caption" style={{ color: "var(--text-muted)" }}>
            Good morning,
          </p>
          <p style={{ fontSize: 17, fontWeight: 600, color: "var(--text)" }}>
            Hajri Business
          </p>
        </div>
        <button
          className="relative flex items-center justify-center shrink-0"
          style={{
            width: 40,
            height: 40,
            borderRadius: "var(--radius-card)",
            color: "var(--text-muted)",
          }}
        >
          <Bell size={20} />
          <span
            className="absolute"
            style={{
              top: 8,
              right: 8,
              width: 8,
              height: 8,
              borderRadius: "var(--radius-pill)",
              backgroundColor: "var(--accent)",
              border: "2px solid var(--bg)",
            }}
          />
        </button>
      </div>

      {/* ── Hero + Stats grid ── */}
      <div className="grid gap-3 md:grid-cols-3">
        <div className="md:col-span-2">
          <HeroCard />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-1 gap-3">
          <StatCard
            icon={<Users size={16} />}
            value={`${homeStats.presentToday}/${homeStats.totalWorkers}`}
            label="Present today"
          />
          <StatCard
            icon={<Banknote size={16} />}
            value={formatPaise(homeStats.advancesPaise)}
            label="Advances"
          />
        </div>
      </div>

      {/* ── Tab strip ── */}
      <div
        className="flex gap-2 overflow-x-auto"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {attendanceTabs.map((t) => {
          const isActive = t.key === tab;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="shrink-0 text-caption"
              style={{
                padding: "8px 16px",
                borderRadius: "var(--radius-pill)",
                backgroundColor: isActive
                  ? "var(--accent-soft)"
                  : "var(--surface)",
                color: isActive ? "var(--accent)" : "var(--text-muted)",
                fontWeight: isActive ? 600 : 500,
                transition: "all 0.2s ease",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ── Employee list / table ── */}
      <EmployeeList employees={filtered} />
    </div>
  );
}
