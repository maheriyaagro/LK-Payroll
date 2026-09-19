// src/server/preRunChecks.ts
// Server-side pre-run checks for payroll run approval.
// Errors block approval. Warnings need a tick-box acknowledgement.

import { createClient } from "@/lib/supabase/server";

export interface PreRunCheckEmployee {
  id: string;
  name: string;
  code: string;
}

export interface PreRunCheckItem {
  severity: "error" | "warning";
  code: string;
  message: string;
  employee?: PreRunCheckEmployee;
}

/**
 * Executes comprehensive pre-run checks for a given payroll run.
 */
export async function runPreRunChecks(runId: string): Promise<PreRunCheckItem[]> {
  const supabase = await createClient();

  // 1. Fetch the payroll run
  const { data: run, error: runError } = await supabase
    .from("payroll_runs")
    .select("id, org_id, period_month, status")
    .eq("id", runId)
    .single();

  if (runError || !run) {
    throw new Error(`Payroll run ${runId} not found`);
  }

  // Parse period month "YYYY-MM"
  const [yearStr, monthStr] = run.period_month.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const daysInMonth = new Date(year, month, 0).getDate();

  // Calculate previous month string "YYYY-MM"
  const prevMonthDate = new Date(year, month - 2, 1);
  const prevYear = prevMonthDate.getFullYear();
  const prevMonth = String(prevMonthDate.getMonth() + 1).padStart(2, "0");
  const prevPeriodMonth = `${prevYear}-${prevMonth}`;

  // 2. Fetch items for this run
  const { data: items } = await supabase
    .from("payroll_items")
    .select("id, employee_id, gross_paise, deductions_paise, net_paise, snapshot, employees(id, code, name, employment_type, bank_account_masked, is_active)")
    .eq("run_id", runId);

  const payrollItems = items || [];

  // 3. Fetch previous month's run items (for 25% pay variance check)
  const { data: prevRun } = await supabase
    .from("payroll_runs")
    .select("id")
    .eq("org_id", run.org_id)
    .eq("period_month", prevPeriodMonth)
    .in("status", ["approved", "paid"])
    .maybeSingle();

  let prevMonthItemsMap = new Map<string, bigint>();
  if (prevRun) {
    const { data: prevItems } = await supabase
      .from("payroll_items")
      .select("employee_id, net_paise")
      .eq("run_id", prevRun.id);

    if (prevItems) {
      for (const pi of prevItems) {
        prevMonthItemsMap.set(pi.employee_id, BigInt(pi.net_paise));
      }
    }
  }

  // 4. Fetch attendance records for this month
  const startDate = `${run.period_month}-01`;
  const endDate = `${run.period_month}-${String(daysInMonth).padStart(2, "0")}`;

  const { data: attendanceRows } = await supabase
    .from("attendance_records")
    .select("employee_id, work_date, status")
    .eq("org_id", run.org_id)
    .gte("work_date", startDate)
    .lte("work_date", endDate);

  // Map of employeeId -> Set of marked dates
  const markedAttendanceMap = new Map<string, Set<string>>();
  if (attendanceRows) {
    for (const att of attendanceRows) {
      if (!markedAttendanceMap.has(att.employee_id)) {
        markedAttendanceMap.set(att.employee_id, new Set());
      }
      markedAttendanceMap.get(att.employee_id)!.add(att.work_date);
    }
  }

  // 5. Fetch active advances for the organization
  const { data: advances } = await supabase
    .from("advances")
    .select("id, employee_id, amount_paise, recovery_per_month_paise, balance_paise")
    .eq("org_id", run.org_id);

  const checks: PreRunCheckItem[] = [];

  // -------------------------------------------------------------
  // Check 1: Duplicate bank accounts across active employees
  // -------------------------------------------------------------
  const bankAccountMap = new Map<string, { id: string; name: string; code: string }[]>();
  for (const item of payrollItems) {
    const emp = item.employees as any;
    if (emp && emp.bank_account_masked && emp.bank_account_masked.trim() && emp.bank_account_masked !== "XXXX-XXXX-0000") {
      const acc = emp.bank_account_masked.trim();
      if (!bankAccountMap.has(acc)) {
        bankAccountMap.set(acc, []);
      }
      bankAccountMap.get(acc)!.push({ id: emp.id, name: emp.name, code: emp.code });
    }
  }

  for (const [account, emps] of bankAccountMap.entries()) {
    if (emps.length > 1) {
      const empNames = emps.map((e) => `${e.name} (${e.code})`).join(", ");
      checks.push({
        severity: "error",
        code: "DUPLICATE_BANK_ACCOUNT",
        message: `Duplicate bank account "${account}" shared across: ${empNames}`,
        employee: emps[0],
      });
    }
  }

  // -------------------------------------------------------------
  // Employee-specific checks (attendance, net pay, variance, wageCode, advance)
  // -------------------------------------------------------------
  for (const item of payrollItems) {
    const emp = item.employees as any;
    if (!emp) continue;

    const empRef: PreRunCheckEmployee = {
      id: emp.id,
      name: emp.name,
      code: emp.code,
    };

    const netPaise = BigInt(item.net_paise);
    const snapshot = (item.snapshot || {}) as any;

    // Check 2: Attendance not marked for any working day
    // Working days: Monday to Saturday (DOW 1 to 6)
    const markedDates = markedAttendanceMap.get(emp.id) || new Set<string>();
    const missingDays: string[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${run.period_month}-${String(day).padStart(2, "0")}`;
      const dayOfWeek = new Date(year, month - 1, day).getDay(); // 0 = Sun

      // Treat Mon-Sat as expected working days unless already marked (or weekly off 'W')
      if (dayOfWeek !== 0) {
        if (!markedDates.has(dateStr)) {
          missingDays.push(dateStr);
        }
      }
    }

    if (missingDays.length > 0) {
      // If missing more than 5 days, report summary, otherwise list dates
      const missingDetail = missingDays.length > 3
        ? `${missingDays.length} working days (e.g. ${missingDays.slice(0, 3).join(", ")}...)`
        : missingDays.join(", ");

      checks.push({
        severity: "error",
        code: `UNMARKED_ATTENDANCE_${emp.code}`,
        message: `Attendance not marked for ${missingDetail} for ${emp.name} (${emp.code})`,
        employee: empRef,
      });
    }

    // Check 3: Net pay is negative or zero for a monthly employee
    if (emp.employment_type === "monthly") {
      if (netPaise <= 0n) {
        checks.push({
          severity: "error",
          code: `ZERO_OR_NEGATIVE_NET_MONTHLY_${emp.code}`,
          message: `Net pay is zero or negative (₹${(Number(netPaise) / 100).toFixed(2)}) for monthly employee ${emp.name}`,
          employee: empRef,
        });
      }
    }

    // Check 4: Net pay differs from last month by more than 25%
    if (prevMonthItemsMap.has(emp.id)) {
      const prevNetPaise = prevMonthItemsMap.get(emp.id)!;
      if (prevNetPaise > 0n) {
        const currentNum = Number(netPaise);
        const prevNum = Number(prevNetPaise);
        const diffRatio = Math.abs(currentNum - prevNum) / prevNum;

        if (diffRatio > 0.25) {
          const pct = Math.round(diffRatio * 100);
          const dir = currentNum > prevNum ? "increase" : "decrease";
          checks.push({
            severity: "warning",
            code: `PAY_VARIANCE_25_PCT_${emp.code}`,
            message: `Net pay differs by ${pct}% ${dir} from last month (₹${(prevNum / 100).toLocaleString("en-IN")} → ₹${(currentNum / 100).toLocaleString("en-IN")}) for ${emp.name}`,
            employee: empRef,
          });
        }
      }
    }

    // Check 5: Wage code check warnings (Section 2(y) 50% remuneration)
    if (snapshot.warnings && Array.isArray(snapshot.warnings)) {
      for (const w of snapshot.warnings) {
        checks.push({
          severity: "warning",
          code: `WAGE_CODE_BREACH_${emp.code}`,
          message: `${w} for ${emp.name} (${emp.code})`,
          employee: empRef,
        });
      }
    }

    // Check 6: Advance balance would go negative
    const empAdvances = (advances || []).filter((a: any) => a.employee_id === emp.id);
    for (const adv of empAdvances) {
      const bal = BigInt(adv.balance_paise);
      const rec = BigInt(adv.recovery_per_month_paise);
      if (bal - rec < 0n && bal > 0n) {
        checks.push({
          severity: "error",
          code: `ADVANCE_BALANCE_NEGATIVE_${emp.code}`,
          message: `Advance recovery of ₹${Number(rec) / 100} exceeds remaining balance of ₹${Number(bal) / 100} for ${emp.name}`,
          employee: empRef,
        });
      }
    }
  }

  return checks;
}
