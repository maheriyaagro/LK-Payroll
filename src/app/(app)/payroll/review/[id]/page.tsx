// src/app/(app)/payroll/review/[id]/page.tsx
// Server component fetching run details, pre-run checks, and employee roster for review.

import Link from "next/link";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { runPreRunChecks } from "@/server/preRunChecks";
import ReviewClient from "./ReviewClient";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PayrollReviewPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  // 1. Fetch the payroll run
  const { data: run, error: runError } = await supabase
    .from("payroll_runs")
    .select("id, org_id, period_month, status, locked_at, reversal_of_id")
    .eq("id", id)
    .single();

  if (runError || !run) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6">
        <div
          className="flex items-center justify-center w-16 h-16 rounded-full mb-4"
          style={{ backgroundColor: "var(--surface)", color: "var(--negative)" }}
        >
          <AlertCircle size={32} />
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)" }}>
          Payroll Run Not Found
        </h1>
        <p className="text-caption mt-1 mb-6" style={{ color: "var(--text-muted)" }}>
          The requested payroll run could not be located or has been archived.
        </p>
        <Link
          href="/payroll"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold"
          style={{ backgroundColor: "var(--accent)", color: "#FFFFFF" }}
        >
          <ArrowLeft size={16} />
          <span>Return to Payroll</span>
        </Link>
      </div>
    );
  }

  // 2. Fetch items for this run
  const { data: items } = await supabase
    .from("payroll_items")
    .select(`
      id,
      employee_id,
      gross_paise,
      deductions_paise,
      net_paise,
      days_paid,
      employees (
        id,
        code,
        name,
        designation,
        employment_type,
        bank_account_masked
      )
    `)
    .eq("run_id", id);

  const payrollItems = (items || []).map((i: any) => ({
    id: i.id,
    employee_id: i.employee_id,
    gross_paise: i.gross_paise,
    deductions_paise: i.deductions_paise,
    net_paise: i.net_paise,
    days_paid: i.days_paid,
    employee: i.employees || {
      id: i.employee_id,
      code: "UNKNOWN",
      name: "Worker",
      designation: "Staff",
      employment_type: "monthly",
      bank_account_masked: null,
    },
  }));

  // 3. Compute totals
  let grossPaise = 0n;
  let deductionsPaise = 0n;
  let netPaise = 0n;
  for (const pi of payrollItems) {
    grossPaise += BigInt(pi.gross_paise);
    deductionsPaise += BigInt(pi.deductions_paise);
    netPaise += BigInt(pi.net_paise);
  }

  // 4. Run automated pre-run checks
  const checks = await runPreRunChecks(id);

  return (
    <ReviewClient
      run={run}
      items={payrollItems}
      checks={checks}
      totals={{ grossPaise, deductionsPaise, netPaise }}
    />
  );
}
