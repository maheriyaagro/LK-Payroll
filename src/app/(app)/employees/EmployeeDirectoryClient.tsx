// src/app/(app)/employees/EmployeeDirectoryClient.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  Plus,
  Edit2,
  Phone,
  Building2,
  Calendar,
  Briefcase,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from "lucide-react";
import type { EmployeeRecord } from "@/lib/data/employees";

interface Props {
  employees: EmployeeRecord[];
}

export default function EmployeeDirectoryClient({ employees }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");

  const counts = {
    all: employees.length,
    monthly: employees.filter((e) => e.employment_type === "monthly").length,
    daily: employees.filter((e) => e.employment_type === "daily").length,
    hourly: employees.filter((e) => e.employment_type === "hourly").length,
    contract: employees.filter((e) => e.employment_type === "contract").length,
  };

  const filteredEmployees = employees.filter((emp) => {
    const matchesType =
      selectedType === "all" || emp.employment_type === selectedType;

    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      emp.name.toLowerCase().includes(q) ||
      emp.code.toLowerCase().includes(q) ||
      (emp.designation && emp.designation.toLowerCase().includes(q)) ||
      (emp.department && emp.department.toLowerCase().includes(q)) ||
      (emp.phone && emp.phone.includes(q));

    return matchesType && matchesSearch;
  });

  const formatPaiseToRupees = (paise: number, type: string) => {
    const inr = (paise / 100).toLocaleString("en-IN");
    if (type === "daily") return `₹${inr} / day`;
    if (type === "hourly") return `₹${inr} / hr`;
    return `₹${inr} / mo`;
  };

  const getInitials = (name: string) => {
    return (
      name
        .trim()
        .split(" ")
        .map((n) => n[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase() || "EM"
    );
  };

  return (
    <div className="flex flex-col gap-5 pt-2 pb-32 md:pb-16 max-w-5xl mx-auto">
      {/* ── 1. Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div
              className="flex items-center justify-center w-8 h-8 rounded-lg"
              style={{ backgroundColor: "var(--accent-soft)", color: "var(--accent)" }}
            >
              <Users size={18} />
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)" }}>
              Staff & Employees
            </h1>
          </div>
          <p className="text-caption mt-1" style={{ color: "var(--text-muted)" }}>
            Directory of your workforce, compensation rates, and statutory records
          </p>
        </div>

        <Link
          href="/employees/new"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm transition-transform active:scale-95 self-start sm:self-auto"
          style={{
            backgroundColor: "var(--accent)",
            color: "#FFFFFF",
            boxShadow: "0 4px 14px rgba(254, 87, 51, 0.35)",
          }}
        >
          <Plus size={18} strokeWidth={2.5} />
          <span>Add Employee</span>
        </Link>
      </div>

      {/* ── 2. Metric Counters ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          className="p-3.5 rounded-2xl flex flex-col justify-between"
          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <span className="text-caption font-semibold" style={{ color: "var(--text-muted)" }}>
            Total Workforce
          </span>
          <p className="text-h1 mt-2" style={{ color: "var(--text)" }}>
            {counts.all}
          </p>
        </div>

        <div
          className="p-3.5 rounded-2xl flex flex-col justify-between"
          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <span className="text-caption font-semibold" style={{ color: "var(--text-muted)" }}>
            Monthly Staff
          </span>
          <p className="text-h1 mt-2" style={{ color: "var(--accent)" }}>
            {counts.monthly}
          </p>
        </div>

        <div
          className="p-3.5 rounded-2xl flex flex-col justify-between"
          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <span className="text-caption font-semibold" style={{ color: "var(--text-muted)" }}>
            Daily Wage (Dihaadi)
          </span>
          <p className="text-h1 mt-2" style={{ color: "var(--positive)" }}>
            {counts.daily}
          </p>
        </div>

        <div
          className="p-3.5 rounded-2xl flex flex-col justify-between"
          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <span className="text-caption font-semibold" style={{ color: "var(--text-muted)" }}>
            Hourly / Contract
          </span>
          <p className="text-h1 mt-2" style={{ color: "var(--text)" }}>
            {counts.hourly + counts.contract}
          </p>
        </div>
      </div>

      {/* ── 3. Search & Category Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Bar */}
        <div
          className="flex-1 flex items-center gap-2.5 px-3.5 rounded-full"
          style={{
            height: 44,
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
          }}
        >
          <Search size={16} style={{ color: "var(--text-muted)" }} />
          <input
            type="text"
            placeholder="Search by name, role, code, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-sm outline-none"
            style={{ color: "var(--text)" }}
          />
        </div>

        {/* Type Filter Pills */}
        <div
          className="flex items-center gap-1.5 overflow-x-auto pb-1"
          style={{ scrollbarWidth: "none" }}
        >
          {[
            { key: "all", label: `All (${counts.all})` },
            { key: "monthly", label: `Monthly (${counts.monthly})` },
            { key: "daily", label: `Daily (${counts.daily})` },
            { key: "hourly", label: `Hourly (${counts.hourly})` },
            { key: "contract", label: `Contract (${counts.contract})` },
          ].map((tab) => {
            const isSelected = selectedType === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setSelectedType(tab.key)}
                className="shrink-0 text-caption font-semibold px-3.5 py-2 rounded-full transition-all cursor-pointer"
                style={{
                  backgroundColor: isSelected ? "var(--accent)" : "var(--surface)",
                  color: isSelected ? "#FFFFFF" : "var(--text-muted)",
                  border: isSelected ? "1px solid transparent" : "1px solid var(--border)",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 4. Employees List / Cards ── */}
      {filteredEmployees.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center p-12 text-center rounded-2xl"
          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <div
            className="flex items-center justify-center w-14 h-14 rounded-full mb-3"
            style={{ backgroundColor: "var(--surface-raised)", color: "var(--text-muted)" }}
          >
            <Users size={28} />
          </div>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text)" }}>
            No Employees Found
          </h2>
          <p className="text-caption mt-1 mb-4" style={{ color: "var(--text-muted)" }}>
            {searchQuery
              ? `No workers match "${searchQuery}". Try clearing your search.`
              : "No workers registered in this category yet."}
          </p>
          <Link
            href="/employees/new"
            className="text-xs font-semibold px-4 py-2 rounded-full"
            style={{ backgroundColor: "var(--accent)", color: "#FFFFFF" }}
          >
            Add New Employee
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredEmployees.map((emp) => {
            const badgeColors = {
              monthly: { bg: "rgba(59, 130, 246, 0.15)", text: "#60A5FA" },
              daily: { bg: "rgba(254, 87, 51, 0.15)", text: "var(--accent)" },
              hourly: { bg: "rgba(168, 85, 247, 0.15)", text: "#C084FC" },
              contract: { bg: "rgba(234, 179, 8, 0.15)", text: "#FACC15" },
            }[emp.employment_type] || { bg: "var(--surface-high)", text: "var(--text-muted)" };

            return (
              <div
                key={emp.id}
                className="flex flex-col justify-between p-4 rounded-2xl transition-all hover:border-[var(--accent)]"
                style={{
                  backgroundColor: "var(--surface)",
                  border: "1px solid var(--border)",
                }}
              >
                {/* Upper: Identity & Action */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex items-center justify-center shrink-0 w-11 h-11 rounded-full font-bold shadow-inner"
                      style={{
                        backgroundColor: "var(--surface-raised)",
                        color: "var(--accent)",
                        border: "1px solid var(--border)",
                        fontSize: 14,
                      }}
                    >
                      {getInitials(emp.name)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2
                          className="truncate max-w-[180px] sm:max-w-[220px]"
                          style={{ fontSize: 16, fontWeight: 600, color: "var(--text)" }}
                        >
                          {emp.name}
                        </h2>
                        <span
                          className="text-[11px] font-mono px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: "var(--surface-raised)",
                            color: "var(--text-muted)",
                            border: "1px solid var(--border)",
                          }}
                        >
                          {emp.code}
                        </span>
                      </div>
                      <p className="text-caption mt-0.5" style={{ color: "var(--text-muted)" }}>
                        {emp.designation || "Worker"} • {emp.department || "General"}
                      </p>
                    </div>
                  </div>

                  {/* Edit button */}
                  <Link
                    href={`/employees/${emp.id}/edit`}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-caption font-semibold transition-colors hover:bg-[var(--surface-high)]"
                    style={{
                      backgroundColor: "var(--surface-raised)",
                      color: "var(--text-muted)",
                      border: "1px solid var(--border)",
                    }}
                    title="Edit Employee"
                  >
                    <Edit2 size={13} />
                    <span>Edit</span>
                  </Link>
                </div>

                {/* Middle: Compensation Rate & Type Badge */}
                <div
                  className="flex items-center justify-between mt-4 pt-3"
                  style={{ borderTop: "1px solid var(--border)" }}
                >
                  <div>
                    <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                      Base Pay Rate
                    </span>
                    <p className="font-semibold text-sm" style={{ color: "var(--text)" }}>
                      {formatPaiseToRupees(emp.base_wage_paise, emp.employment_type)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className="text-caption font-semibold px-2.5 py-0.5 rounded-full capitalize"
                      style={{
                        backgroundColor: badgeColors.bg,
                        color: badgeColors.text,
                      }}
                    >
                      {emp.employment_type}
                    </span>
                    {emp.is_active ? (
                      <span
                        className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: "color-mix(in srgb, var(--positive) 12%, transparent)",
                          color: "var(--positive)",
                        }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--positive)]" />
                        Active
                      </span>
                    ) : (
                      <span
                        className="text-[11px] px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: "var(--surface-raised)",
                          color: "var(--text-muted)",
                        }}
                      >
                        Inactive
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom: Phone & Bank Details */}
                <div className="flex items-center justify-between text-caption mt-2 pt-2 text-[var(--text-muted)]">
                  <span>{emp.phone || "No phone"}</span>
                  <span>{emp.bank_account_masked || "No bank record"}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
