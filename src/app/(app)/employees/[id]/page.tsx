// src/app/(app)/employees/[id]/page.tsx
// Full employee profile view with personal info, salary structure, and quick actions.

import Link from "next/link";
import {
  ArrowLeft,
  Edit,
  Phone,
  Briefcase,
  Building2,
  Calendar,
  CreditCard,
  ShieldCheck,
  IndianRupee,
  UserCheck,
  UserX,
} from "lucide-react";
import { getEmployeeById } from "@/lib/data/employees";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EmployeeProfilePage({ params }: Props) {
  const { id } = await params;
  const employee = await getEmployeeById(id);

  if (!employee) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6">
        <div
          className="flex items-center justify-center w-16 h-16 rounded-full mb-4"
          style={{ backgroundColor: "var(--surface)", color: "var(--text-muted)" }}
        >
          <UserX size={32} />
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)" }}>
          Employee Not Found
        </h1>
        <p className="text-caption mt-1 mb-6" style={{ color: "var(--text-muted)" }}>
          The requested employee record could not be found.
        </p>
        <Link
          href="/employees"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold"
          style={{ backgroundColor: "var(--accent)", color: "#FFFFFF" }}
        >
          <ArrowLeft size={16} />
          <span>Back to Employee List</span>
        </Link>
      </div>
    );
  }

  const initials =
    employee.name
      .trim()
      .split(" ")
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "EM";

  const formattedBaseWage = `₹${Math.round(employee.base_wage_paise / 100).toLocaleString("en-IN")}`;

  return (
    <div className="flex flex-col gap-5 pt-2 pb-28 max-w-4xl mx-auto">
      {/* ── 1. Top Navigation Bar ── */}
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/attendance"
          className="inline-flex items-center gap-2 text-sm font-medium transition-colors hover:text-white"
          style={{ color: "var(--text-muted)" }}
        >
          <ArrowLeft size={18} />
          <span>Back to Attendance</span>
        </Link>

        <Link
          href={`/employees/${employee.id}/edit`}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all active:scale-95 cursor-pointer"
          style={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            color: "var(--text)",
          }}
        >
          <Edit size={14} style={{ color: "var(--accent)" }} />
          <span>Edit Profile</span>
        </Link>
      </div>

      {/* ── 2. Hero Employee Card ── */}
      <div
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 sm:p-6"
        style={{
          backgroundColor: "var(--surface)",
          borderRadius: "var(--radius-card)",
          border: "1px solid var(--border)",
        }}
      >
        <div className="flex items-center gap-4">
          <div
            className="flex items-center justify-center shrink-0 w-16 h-16 rounded-full text-xl font-bold"
            style={{
              backgroundColor: "var(--surface-high)",
              color: "var(--accent)",
              border: "2px solid rgba(254, 87, 51, 0.3)",
            }}
          >
            {initials}
          </div>

          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
                {employee.name}
              </h1>
              <span
                className="px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide"
                style={{
                  backgroundColor: employee.is_active
                    ? "color-mix(in srgb, var(--positive) 15%, transparent)"
                    : "color-mix(in srgb, var(--negative) 15%, transparent)",
                  color: employee.is_active ? "var(--positive)" : "var(--negative)",
                }}
              >
                {employee.is_active ? "Active" : "Inactive"}
              </span>
            </div>

            <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
              {employee.designation || "Staff"} • {employee.department || "General"}
            </p>
            <p className="text-xs font-mono mt-1" style={{ color: "var(--text-muted)" }}>
              ID: {employee.code}
            </p>
          </div>
        </div>

        <div
          className="flex flex-col sm:items-end w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0"
          style={{ borderColor: "var(--border)" }}
        >
          <span className="text-xs uppercase tracking-wider font-semibold" style={{ color: "var(--text-muted)" }}>
            Base Wage ({employee.employment_type})
          </span>
          <span className="text-2xl font-bold tracking-tight mt-0.5" style={{ color: "var(--positive)" }}>
            {formattedBaseWage}
          </span>
        </div>
      </div>

      {/* ── 3. Quick Info Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Contact info */}
        <div
          className="p-4 flex items-start gap-3"
          style={{
            backgroundColor: "var(--surface)",
            borderRadius: "var(--radius-card)",
            border: "1px solid var(--border)",
          }}
        >
          <div
            className="p-2 rounded-lg shrink-0"
            style={{ backgroundColor: "var(--surface-high)", color: "var(--accent)" }}
          >
            <Phone size={18} />
          </div>
          <div>
            <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Phone</p>
            <p className="text-sm font-semibold mt-0.5" style={{ color: "var(--text)" }}>
              {employee.phone || "Not provided"}
            </p>
          </div>
        </div>

        {/* Date of Joining */}
        <div
          className="p-4 flex items-start gap-3"
          style={{
            backgroundColor: "var(--surface)",
            borderRadius: "var(--radius-card)",
            border: "1px solid var(--border)",
          }}
        >
          <div
            className="p-2 rounded-lg shrink-0"
            style={{ backgroundColor: "var(--surface-high)", color: "var(--accent)" }}
          >
            <Calendar size={18} />
          </div>
          <div>
            <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Date of Joining</p>
            <p className="text-sm font-semibold mt-0.5" style={{ color: "var(--text)" }}>
              {employee.doj ? new Date(employee.doj).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "—"}
            </p>
          </div>
        </div>

        {/* Employment Type */}
        <div
          className="p-4 flex items-start gap-3"
          style={{
            backgroundColor: "var(--surface)",
            borderRadius: "var(--radius-card)",
            border: "1px solid var(--border)",
          }}
        >
          <div
            className="p-2 rounded-lg shrink-0"
            style={{ backgroundColor: "var(--surface-high)", color: "var(--accent)" }}
          >
            <Briefcase size={18} />
          </div>
          <div>
            <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Employment Type</p>
            <p className="text-sm font-semibold capitalize mt-0.5" style={{ color: "var(--text)" }}>
              {employee.employment_type}
            </p>
          </div>
        </div>
      </div>

      {/* ── 4. Statutory & Banking Details ── */}
      <div
        className="p-5"
        style={{
          backgroundColor: "var(--surface)",
          borderRadius: "var(--radius-card)",
          border: "1px solid var(--border)",
        }}
      >
        <h2 className="text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
          <ShieldCheck size={16} style={{ color: "var(--accent)" }} />
          <span>Statutory & Banking Details</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Bank Account</p>
            <p className="text-sm font-mono font-semibold mt-0.5" style={{ color: "var(--text)" }}>
              {employee.bank_account_masked || "—"}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>PF UAN</p>
            <p className="text-sm font-mono font-semibold mt-0.5" style={{ color: "var(--text)" }}>
              {employee.pf_uan || "Not enrolled"}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>ESI Insurance No.</p>
            <p className="text-sm font-mono font-semibold mt-0.5" style={{ color: "var(--text)" }}>
              {employee.esi_ic || "Not enrolled"}
            </p>
          </div>
        </div>
      </div>

      {/* ── 5. Salary Structure Breakdown ── */}
      <div
        className="p-5"
        style={{
          backgroundColor: "var(--surface)",
          borderRadius: "var(--radius-card)",
          border: "1px solid var(--border)",
        }}
      >
        <h2 className="text-sm font-bold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
          <IndianRupee size={16} style={{ color: "var(--accent)" }} />
          <span>Salary Structure Components</span>
        </h2>

        {employee.components && employee.components.length > 0 ? (
          <div className="divide-y divide-white/5">
            {employee.components.map((comp) => (
              <div key={comp.id || comp.code} className="py-2.5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--text)" }}>
                    {comp.label}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {comp.code} • {comp.kind}
                  </p>
                </div>
                <span className="text-sm font-semibold font-mono" style={{ color: "var(--text)" }}>
                  ₹{Math.round(comp.amount_paise / 100).toLocaleString("en-IN")}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs py-2" style={{ color: "var(--text-muted)" }}>
            Standard base wage assigned with statutory defaults.
          </p>
        )}
      </div>
    </div>
  );
}
