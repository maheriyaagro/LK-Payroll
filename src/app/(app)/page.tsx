"use client";

import { useState } from "react";
import { Users, Banknote } from "lucide-react";
import HeroCard from "@/components/home/HeroCard";
import StatCard from "@/components/home/StatCard";
import EmployeeList from "@/components/home/EmployeeList";
import ProfileMenu from "@/components/shell/ProfileMenu";
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
    <div
      className="flex flex-col gap-4 pb-4 md:pt-6"
      style={{
        paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)",
      }}
    >
      {/* ── Greeting row with ProfileMenu ── */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="flex-1 min-w-0">
          <p className="text-caption" style={{ color: "var(--text-muted)" }}>
            Good morning,
          </p>
          <p style={{ fontSize: 18, fontWeight: 700, color: "var(--text)" }}>
            Hajri Business
          </p>
        </div>
        <div className="flex items-center">
          <ProfileMenu size="md" />
        </div>
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
