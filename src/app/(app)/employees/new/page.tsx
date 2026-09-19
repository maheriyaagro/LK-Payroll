"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  User,
  Phone,
  Briefcase,
  IndianRupee,
  Building2,
  Calendar,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { createEmployeeAction } from "@/app/actions/employees";

const COMMON_ROLES = [
  "Mason",
  "Electrician",
  "Plumber",
  "Carpenter",
  "Painter",
  "Labourer",
  "Helper",
  "Supervisor",
];

export default function AddEmployeePage() {
  const router = useRouter();

  // Form states
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("Mason");
  const [customRole, setCustomRole] = useState("");
  const [wageType, setWageType] = useState<"daily" | "monthly">("daily");
  const [wageAmount, setWageAmount] = useState("650");
  const [overtimeEligible, setOvertimeEligible] = useState(true);
  const [bankAccount, setBankAccount] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [joiningDate, setJoiningDate] = useState("2026-09-18");

  // Submission feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Computed initials
  const initials = name
    .trim()
    .split(" ")
    .map((n: string) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "NEW";

  const activeRole = role === "Other" ? customRole || "Worker" : role;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage("Please enter the employee's full name.");
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const parsedAmount = parseInt(wageAmount.replace(/[^0-9]/g, ""), 10) || (wageType === "daily" ? 650 : 18000);
      const wagePaise = parsedAmount * 100; // integer paise

      const res = await createEmployeeAction({
        name: name.trim(),
        phone: phone.trim() ? `+91${phone.trim()}` : undefined,
        designation: activeRole,
        department: "Operations",
        employment_type: wageType === "daily" ? "daily" : "monthly",
        doj: joiningDate || new Date().toISOString().split("T")[0],
        base_wage_paise: wagePaise,
        bank_account_masked: bankAccount ? `•••• ${bankAccount.slice(-4)}` : undefined,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Failed to create employee.");
        setIsSubmitting(false);
        return;
      }

      setIsSubmitting(false);
      setIsSuccess(true);
      setTimeout(() => {
        router.push("/employees");
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 pt-2 pb-36 md:pb-16 max-w-xl mx-auto">
      {/* ── 1. Top Navigation & Title ── */}
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="flex items-center justify-center shrink-0 w-9 h-9 rounded-full transition-colors"
          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)" }}>
            Add New Employee
          </h1>
          <p className="text-caption" style={{ color: "var(--text-muted)" }}>
            Register worker to your attendance and payroll list
          </p>
        </div>
      </div>

      {/* Success Notification */}
      {isSuccess ? (
        <div
          className="flex flex-col items-center justify-center text-center p-8 rounded-2xl animate-fadeIn"
          style={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--positive)",
          }}
        >
          <div
            className="flex items-center justify-center w-16 h-16 rounded-full mb-3"
            style={{
              backgroundColor: "color-mix(in srgb, var(--positive) 15%, transparent)",
              color: "var(--positive)",
            }}
          >
            <CheckCircle2 size={36} />
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)" }}>
            {name} Added Successfully!
          </h2>
          <p className="text-caption mt-1 mb-4" style={{ color: "var(--text-muted)" }}>
            Added to organization staff directory as <strong>{activeRole}</strong>. Redirecting to employee list...
          </p>
          <Link
            href="/employees"
            className="text-sm font-semibold px-6 py-2.5 rounded-full"
            style={{ backgroundColor: "var(--accent)", color: "#FFFFFF" }}
          >
            Go to Employee List
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* ── 2. Live Avatar Preview Card ── */}
          <div
            className="flex items-center gap-4 p-4 rounded-2xl"
            style={{
              backgroundColor: "var(--surface-raised)",
              border: "1px solid var(--border)",
            }}
          >
            <div
              className="flex items-center justify-center shrink-0 w-14 h-14 rounded-full font-bold shadow-md"
              style={{
                backgroundColor: "var(--surface-high)",
                color: name ? "var(--accent)" : "var(--text-muted)",
                fontSize: 18,
                border: "2px solid var(--border)",
              }}
            >
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p style={{ fontSize: 16, fontWeight: 600, color: "var(--text)" }}>
                {name || "Worker Name"}
              </p>
              <p className="text-caption mt-0.5" style={{ color: "var(--text-muted)" }}>
                {activeRole} • {wageType === "daily" ? `₹${wageAmount || 0}/day` : `₹${wageAmount || 0}/mo`}
              </p>
            </div>
          </div>

          {errorMessage && (
            <div
              className="px-4 py-2.5 rounded-xl text-caption font-medium text-center"
              style={{
                backgroundColor: "color-mix(in srgb, var(--negative) 12%, transparent)",
                color: "var(--negative)",
                border: "1px solid var(--negative)",
              }}
            >
              {errorMessage}
            </div>
          )}

          {/* ── 3. Basic Details Section ── */}
          <div
            className="flex flex-col gap-3.5 p-4 rounded-2xl"
            style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <h2 className="text-caption font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Personal Details
            </h2>

            {/* Name Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-caption font-semibold" style={{ color: "var(--text)" }}>
                Full Name <span style={{ color: "var(--accent)" }}>*</span>
              </label>
              <div
                className="flex items-center gap-2.5 px-3.5 rounded-xl"
                style={{
                  height: 48,
                  backgroundColor: "var(--surface-raised)",
                  border: "1px solid var(--border)",
                }}
              >
                <User size={18} style={{ color: "var(--text-muted)" }} />
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-transparent text-sm font-medium outline-none"
                  style={{ color: "var(--text)" }}
                />
              </div>
            </div>

            {/* Phone Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-caption font-semibold" style={{ color: "var(--text)" }}>
                Mobile Number
              </label>
              <div
                className="flex items-center gap-2 px-3.5 rounded-xl"
                style={{
                  height: 48,
                  backgroundColor: "var(--surface-raised)",
                  border: "1px solid var(--border)",
                }}
              >
                <span className="text-caption font-bold" style={{ color: "var(--text-muted)" }}>
                  +91
                </span>
                <input
                  type="tel"
                  maxLength={10}
                  placeholder="98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  className="w-full bg-transparent text-sm font-medium outline-none"
                  style={{ color: "var(--text)" }}
                />
              </div>
            </div>

            {/* Role / Trade Quick Selection */}
            <div className="flex flex-col gap-2">
              <label className="text-caption font-semibold" style={{ color: "var(--text)" }}>
                Designation / Trade
              </label>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_ROLES.map((r) => {
                  const isSelected = role === r;
                  return (
                    <button
                      type="button"
                      key={r}
                      onClick={() => setRole(r)}
                      className="px-3 py-1.5 rounded-full text-caption font-medium transition-all cursor-pointer"
                      style={{
                        backgroundColor: isSelected ? "var(--accent)" : "var(--surface-high)",
                        color: isSelected ? "#FFFFFF" : "var(--text-muted)",
                        boxShadow: isSelected ? "0 2px 8px rgba(254, 87, 51, 0.35)" : "none",
                      }}
                    >
                      {r}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── 4. Wages & Attendance Setup ── */}
          <div
            className="flex flex-col gap-3.5 p-4 rounded-2xl"
            style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <h2 className="text-caption font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Wage & Calculation Basis
            </h2>

            {/* Wage type toggle */}
            <div
              className="flex p-1 rounded-xl"
              style={{ backgroundColor: "var(--surface-raised)" }}
            >
              <button
                type="button"
                onClick={() => {
                  setWageType("daily");
                  if (wageAmount === "18000") setWageAmount("650");
                }}
                className="flex-1 py-2 rounded-lg text-caption font-semibold transition-all cursor-pointer"
                style={{
                  backgroundColor: wageType === "daily" ? "var(--surface-high)" : "transparent",
                  color: wageType === "daily" ? "var(--text)" : "var(--text-muted)",
                  boxShadow: wageType === "daily" ? "0 2px 6px rgba(0,0,0,0.3)" : "none",
                }}
              >
                Daily Wage
              </button>
              <button
                type="button"
                onClick={() => {
                  setWageType("monthly");
                  if (wageAmount === "650") setWageAmount("18000");
                }}
                className="flex-1 py-2 rounded-lg text-caption font-semibold transition-all cursor-pointer"
                style={{
                  backgroundColor: wageType === "monthly" ? "var(--surface-high)" : "transparent",
                  color: wageType === "monthly" ? "var(--text)" : "var(--text-muted)",
                  boxShadow: wageType === "monthly" ? "0 2px 6px rgba(0,0,0,0.3)" : "none",
                }}
              >
                Monthly Fixed Salary
              </button>
            </div>

            {/* Wage amount input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-caption font-semibold" style={{ color: "var(--text)" }}>
                {wageType === "daily" ? "Daily Wage Rate" : "Monthly Gross Wage"}
              </label>
              <div
                className="flex items-center gap-2 px-3.5 rounded-xl"
                style={{
                  height: 48,
                  backgroundColor: "var(--surface-raised)",
                  border: "1px solid var(--border)",
                }}
              >
                <span className="text-sm font-bold" style={{ color: "var(--accent)" }}>
                  ₹
                </span>
                <input
                  type="number"
                  required
                  placeholder={wageType === "daily" ? "650" : "18000"}
                  value={wageAmount}
                  onChange={(e) => setWageAmount(e.target.value)}
                  className="w-full bg-transparent text-sm font-semibold tabular-nums outline-none"
                  style={{ color: "var(--text)" }}
                />
                <span className="text-caption shrink-0" style={{ color: "var(--text-muted)" }}>
                  {wageType === "daily" ? "/ day" : "/ month"}
                </span>
              </div>
            </div>

            {/* Overtime check */}
            <label className="flex items-center gap-2.5 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={overtimeEligible}
                onChange={(e) => setOvertimeEligible(e.target.checked)}
                className="w-4 h-4 rounded accent-[var(--accent)]"
              />
              <span className="text-caption font-medium" style={{ color: "var(--text)" }}>
                Worker is eligible for Overtime (OT) hourly calculation
              </span>
            </label>
          </div>

          {/* ── 5. Bank Details (Optional) ── */}
          <div
            className="flex flex-col gap-3.5 p-4 rounded-2xl"
            style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-caption font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                Bank & Payment (Optional)
              </h2>
              <span className="text-caption" style={{ color: "var(--text-muted)" }}>
                For direct bank transfer
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-caption font-semibold" style={{ color: "var(--text)" }}>
                Account Number
              </label>
              <div
                className="flex items-center gap-2 px-3.5 rounded-xl"
                style={{
                  height: 46,
                  backgroundColor: "var(--surface-raised)",
                  border: "1px solid var(--border)",
                }}
              >
                <Building2 size={16} style={{ color: "var(--text-muted)" }} />
                <input
                  type="text"
                  placeholder="e.g. 5010042891234"
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  className="w-full bg-transparent text-sm font-medium outline-none"
                  style={{ color: "var(--text)" }}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-caption font-semibold" style={{ color: "var(--text)" }}>
                IFSC Code
              </label>
              <input
                type="text"
                placeholder="e.g. SBIN0004211"
                value={ifsc}
                onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                className="px-3.5 rounded-xl bg-transparent text-sm font-medium outline-none uppercase"
                style={{
                  height: 46,
                  backgroundColor: "var(--surface-raised)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                }}
              />
            </div>
          </div>

          {/* ── 6. Submit Button ── */}
          <div className="flex flex-col gap-2 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 font-semibold transition-all active:scale-[0.99] cursor-pointer"
              style={{
                height: 50,
                borderRadius: "var(--radius-pill)",
                backgroundColor: "var(--accent)",
                color: "#FFFFFF",
                fontSize: 15,
                boxShadow: "0 4px 14px rgba(254, 87, 51, 0.4)",
              }}
            >
              {isSubmitting ? (
                <span>Adding to Register...</span>
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  <span>Add Employee</span>
                </>
              )}
            </button>
            <Link
              href="/"
              className="text-caption text-center py-1 font-medium transition-colors hover:text-accent"
              style={{ color: "var(--text-muted)" }}
            >
              Cancel and return
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
