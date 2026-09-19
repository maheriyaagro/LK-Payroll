// src/app/(app)/employees/[id]/edit/EditEmployeeClient.tsx
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
  CheckCircle2,
  ShieldCheck,
  CreditCard,
} from "lucide-react";
import { updateEmployeeAction } from "@/app/actions/employees";
import type { EmployeeRecord } from "@/lib/data/employees";

interface Props {
  employee: EmployeeRecord;
}

export default function EditEmployeeClient({ employee }: Props) {
  const router = useRouter();

  const [name, setName] = useState(employee.name || "");
  const [phone, setPhone] = useState(
    employee.phone?.replace(/^\+91/, "") || ""
  );
  const [designation, setDesignation] = useState(employee.designation || "");
  const [department, setDepartment] = useState(employee.department || "Operations");
  const [employmentType, setEmploymentType] = useState<"monthly" | "daily" | "hourly" | "contract">(
    employee.employment_type
  );
  const [wageAmount, setWageAmount] = useState(
    String(Math.round(employee.base_wage_paise / 100))
  );
  const [isActive, setIsActive] = useState(employee.is_active);
  const [bankAccount, setBankAccount] = useState(employee.bank_account_masked || "");
  const [pfUan, setPfUan] = useState(employee.pf_uan || "");
  const [esiIc, setEsiIc] = useState(employee.esi_ic || "");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const initials =
    name
      .trim()
      .split(" ")
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "EM";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage("Employee name is required.");
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const parsedAmount = parseInt(wageAmount.replace(/[^0-9]/g, ""), 10) || 0;
      const wagePaise = parsedAmount * 100; // integer paise

      const res = await updateEmployeeAction(employee.id, {
        name: name.trim(),
        phone: phone.trim() ? `+91${phone.trim()}` : undefined,
        designation: designation.trim() || undefined,
        department: department.trim() || undefined,
        employment_type: employmentType,
        is_active: isActive,
        base_wage_paise: wagePaise,
        bank_account_masked: bankAccount.trim() || undefined,
        pf_uan: pfUan.trim() || undefined,
        esi_ic: esiIc.trim() || undefined,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Failed to update employee.");
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
          href="/employees"
          className="flex items-center justify-center shrink-0 w-9 h-9 rounded-full transition-colors"
          style={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            color: "var(--text)",
          }}
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)" }}>
            Edit Employee: {employee.name}
          </h1>
          <p className="text-caption" style={{ color: "var(--text-muted)" }}>
            Code: {employee.code} • Update profile and compensation rates
          </p>
        </div>
      </div>

      {isSuccess ? (
        <div
          className="flex flex-col items-center justify-center text-center p-8 rounded-2xl"
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
            Employee Updated!
          </h2>
          <p className="text-caption mt-1 mb-4" style={{ color: "var(--text-muted)" }}>
            Changes to {name} have been saved. Redirecting to employee directory...
          </p>
          <Link
            href="/employees"
            className="text-sm font-semibold px-6 py-2.5 rounded-full"
            style={{ backgroundColor: "var(--accent)", color: "#FFFFFF" }}
          >
            Return to Employees
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* ── 2. Live Avatar & Preview ── */}
          <div
            className="flex items-center justify-between p-4 rounded-2xl"
            style={{
              backgroundColor: "var(--surface-raised)",
              border: "1px solid var(--border)",
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex items-center justify-center shrink-0 w-14 h-14 rounded-full font-bold shadow-md"
                style={{
                  backgroundColor: "var(--surface-high)",
                  color: "var(--accent)",
                  fontSize: 18,
                  border: "2px solid var(--border)",
                }}
              >
                {initials}
              </div>
              <div>
                <p style={{ fontSize: 16, fontWeight: 600, color: "var(--text)" }}>
                  {name || "Worker Name"}
                </p>
                <p className="text-caption mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {designation || "Worker"} • {employmentType}
                </p>
              </div>
            </div>

            {/* Active Status Pill Button */}
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className="px-3 py-1.5 rounded-full text-caption font-semibold cursor-pointer transition-all"
              style={{
                backgroundColor: isActive
                  ? "color-mix(in srgb, var(--positive) 15%, transparent)"
                  : "var(--surface-high)",
                color: isActive ? "var(--positive)" : "var(--text-muted)",
                border: isActive
                  ? "1px solid var(--positive)"
                  : "1px solid var(--border)",
              }}
            >
              {isActive ? "● Active Staff" : "○ Inactive"}
            </button>
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

          {/* ── 3. Personal & Contact Details ── */}
          <div
            className="flex flex-col gap-3.5 p-4 rounded-2xl"
            style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <h2
              className="text-caption font-bold uppercase tracking-wider"
              style={{ color: "var(--text-muted)" }}
            >
              Personal & Contact
            </h2>

            {/* Full Name */}
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
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-transparent text-sm font-medium outline-none"
                  style={{ color: "var(--text)" }}
                />
              </div>
            </div>

            {/* Mobile Number */}
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

            {/* Designation */}
            <div className="flex flex-col gap-1.5">
              <label className="text-caption font-semibold" style={{ color: "var(--text)" }}>
                Designation / Trade
              </label>
              <div
                className="flex items-center gap-2.5 px-3.5 rounded-xl"
                style={{
                  height: 48,
                  backgroundColor: "var(--surface-raised)",
                  border: "1px solid var(--border)",
                }}
              >
                <Briefcase size={18} style={{ color: "var(--text-muted)" }} />
                <input
                  type="text"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="w-full bg-transparent text-sm font-medium outline-none"
                  style={{ color: "var(--text)" }}
                />
              </div>
            </div>

            {/* Department */}
            <div className="flex flex-col gap-1.5">
              <label className="text-caption font-semibold" style={{ color: "var(--text)" }}>
                Department
              </label>
              <div
                className="flex items-center gap-2.5 px-3.5 rounded-xl"
                style={{
                  height: 48,
                  backgroundColor: "var(--surface-raised)",
                  border: "1px solid var(--border)",
                }}
              >
                <Building2 size={18} style={{ color: "var(--text-muted)" }} />
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full bg-transparent text-sm font-medium outline-none"
                  style={{ color: "var(--text)" }}
                />
              </div>
            </div>
          </div>

          {/* ── 4. Employment & Compensation Rate ── */}
          <div
            className="flex flex-col gap-3.5 p-4 rounded-2xl"
            style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <h2
              className="text-caption font-bold uppercase tracking-wider"
              style={{ color: "var(--text-muted)" }}
            >
              Employment & Pay Rate
            </h2>

            {/* Employment Type */}
            <div className="flex flex-col gap-1.5">
              <label className="text-caption font-semibold" style={{ color: "var(--text)" }}>
                Employment Type
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { key: "monthly", label: "Monthly" },
                  { key: "daily", label: "Daily" },
                  { key: "hourly", label: "Hourly" },
                  { key: "contract", label: "Contract" },
                ].map((t) => {
                  const isSelected = employmentType === t.key;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setEmploymentType(t.key as any)}
                      className="py-2.5 rounded-xl text-caption font-semibold transition-all cursor-pointer"
                      style={{
                        backgroundColor: isSelected ? "var(--accent)" : "var(--surface-raised)",
                        color: isSelected ? "#FFFFFF" : "var(--text-muted)",
                        border: isSelected ? "1px solid transparent" : "1px solid var(--border)",
                      }}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Base Pay Rate */}
            <div className="flex flex-col gap-1.5">
              <label className="text-caption font-semibold" style={{ color: "var(--text)" }}>
                {employmentType === "daily"
                  ? "Daily Wage (₹ / day)"
                  : employmentType === "hourly"
                  ? "Hourly Rate (₹ / hr)"
                  : "Monthly Rate (₹ / month)"}
              </label>
              <div
                className="flex items-center gap-2.5 px-3.5 rounded-xl"
                style={{
                  height: 48,
                  backgroundColor: "var(--surface-raised)",
                  border: "1px solid var(--border)",
                }}
              >
                <IndianRupee size={18} style={{ color: "var(--accent)" }} />
                <input
                  type="text"
                  required
                  placeholder="e.g. 750"
                  value={wageAmount}
                  onChange={(e) => setWageAmount(e.target.value.replace(/\D/g, ""))}
                  className="w-full bg-transparent text-sm font-semibold outline-none"
                  style={{ color: "var(--text)" }}
                />
              </div>
              <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                Saved in integer paise (₹{wageAmount || 0} = {Number(wageAmount || 0) * 100} paise)
              </span>
            </div>
          </div>

          {/* ── 5. Statutory & Bank Details ── */}
          <div
            className="flex flex-col gap-3.5 p-4 rounded-2xl"
            style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <h2
              className="text-caption font-bold uppercase tracking-wider"
              style={{ color: "var(--text-muted)" }}
            >
              Statutory & Bank (Optional)
            </h2>

            {/* Bank Account */}
            <div className="flex flex-col gap-1.5">
              <label className="text-caption font-semibold" style={{ color: "var(--text)" }}>
                Masked Bank Account
              </label>
              <div
                className="flex items-center gap-2.5 px-3.5 rounded-xl"
                style={{
                  height: 48,
                  backgroundColor: "var(--surface-raised)",
                  border: "1px solid var(--border)",
                }}
              >
                <CreditCard size={18} style={{ color: "var(--text-muted)" }} />
                <input
                  type="text"
                  placeholder="XXXX-XXXX-1234"
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  className="w-full bg-transparent text-sm outline-none"
                  style={{ color: "var(--text)" }}
                />
              </div>
            </div>

            {/* PF UAN */}
            <div className="flex flex-col gap-1.5">
              <label className="text-caption font-semibold" style={{ color: "var(--text)" }}>
                Provident Fund UAN
              </label>
              <div
                className="flex items-center gap-2.5 px-3.5 rounded-xl"
                style={{
                  height: 48,
                  backgroundColor: "var(--surface-raised)",
                  border: "1px solid var(--border)",
                }}
              >
                <ShieldCheck size={18} style={{ color: "var(--text-muted)" }} />
                <input
                  type="text"
                  maxLength={12}
                  placeholder="100904123401"
                  value={pfUan}
                  onChange={(e) => setPfUan(e.target.value.replace(/\D/g, ""))}
                  className="w-full bg-transparent text-sm outline-none font-mono"
                  style={{ color: "var(--text)" }}
                />
              </div>
            </div>

            {/* ESI Insurance */}
            <div className="flex flex-col gap-1.5">
              <label className="text-caption font-semibold" style={{ color: "var(--text)" }}>
                ESIC Insurance IP Number
              </label>
              <div
                className="flex items-center gap-2.5 px-3.5 rounded-xl"
                style={{
                  height: 48,
                  backgroundColor: "var(--surface-raised)",
                  border: "1px solid var(--border)",
                }}
              >
                <ShieldCheck size={18} style={{ color: "var(--text-muted)" }} />
                <input
                  type="text"
                  maxLength={10}
                  placeholder="3104123401"
                  value={esiIc}
                  onChange={(e) => setEsiIc(e.target.value.replace(/\D/g, ""))}
                  className="w-full bg-transparent text-sm outline-none font-mono"
                  style={{ color: "var(--text)" }}
                />
              </div>
            </div>
          </div>

          {/* ── 6. Submit Button ── */}
          <div className="sticky bottom-20 md:bottom-4 z-10 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-full font-bold text-sm shadow-xl transition-transform active:scale-98 disabled:opacity-50 cursor-pointer"
              style={{
                backgroundColor: "var(--accent)",
                color: "#FFFFFF",
                boxShadow: "0 4px 16px rgba(254, 87, 51, 0.4)",
              }}
            >
              {isSubmitting ? "Saving Changes..." : "Save Employee Details"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
