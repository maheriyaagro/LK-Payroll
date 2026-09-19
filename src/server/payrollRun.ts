// src/server/payrollRun.ts
// Lifecycle manager for Payroll Runs:
// draft -> review -> approved -> paid, and approved or paid -> reversed.
// Any other transition throws. Each transition writes an audit_log row with before and after.

import { createClient } from "@/lib/supabase/server";
import { calculatePayroll } from "@/engine/calculate";
import type {
  PayrollInput,
  SalaryComponentInput,
  AttendanceRow,
  AdvanceInput,
  EmployeeInput,
  Period,
} from "@/engine/types";
import { runPreRunChecks } from "./preRunChecks";

export type PayrollRunStatus = "draft" | "review" | "approved" | "paid" | "reversed";

export interface TransitionOptions {
  acknowledgedWarningCodes?: string[];
  reversalReason?: string;
}

/**
 * Valid state transitions mapping:
 * draft -> review
 * review -> approved
 * approved -> paid
 * approved -> reversed
 * paid -> reversed
 */
const VALID_TRANSITIONS: Record<PayrollRunStatus, PayrollRunStatus[]> = {
  draft: ["review"],
  review: ["approved", "draft"], // can move to approved or back to draft for adjustments
  approved: ["paid", "reversed"],
  paid: ["reversed"],
  reversed: [], // terminal
};

/**
 * Helper to serialize BigInts to JSON-safe objects for snapshots.
 */
function serializeBigInts(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "bigint") return obj.toString();
  if (Array.isArray(obj)) return obj.map(serializeBigInts);
  if (typeof obj === "object") {
    const res: any = {};
    for (const k of Object.keys(obj)) {
      res[k] = serializeBigInts(obj[k]);
    }
    return res;
  }
  return obj;
}

/**
 * Creates a new draft payroll run for an organization and period month.
 * Evaluates pure calculatePayroll for every active employee and stores
 * payroll_items and payroll_item_lines with full engine snapshot.
 */
export async function createDraftRun(
  orgId: string,
  periodMonth: string,
  actorId: string
) {
  const supabase = await createClient();

  // 1. Check if an active non-reversed run already exists for this period
  const { data: existingRuns } = await supabase
    .from("payroll_runs")
    .select("id, status")
    .eq("org_id", orgId)
    .eq("period_month", periodMonth);

  const activeRun = (existingRuns || []).find((r) => r.status !== "reversed");
  if (activeRun) {
    throw new Error(
      `A payroll run for ${periodMonth} already exists with status "${activeRun.status}" (ID: ${activeRun.id}).`
    );
  }

  // 2. Parse period details
  const [yearStr, monthStr] = periodMonth.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const daysInMonth = new Date(year, month, 0).getDate();
  const startDate = `${periodMonth}-01`;
  const endDate = `${periodMonth}-${String(daysInMonth).padStart(2, "0")}`;

  const period: Period = {
    year,
    month,
    daysInMonth,
    startDate,
    endDate,
  };

  // 3. Fetch all active employees
  const { data: employees, error: empError } = await supabase
    .from("employees")
    .select(`
      id,
      code,
      name,
      employment_type,
      doj,
      dol,
      is_active,
      salary_structures (
        id,
        effective_from,
        effective_to,
        salary_components (
          id,
          code,
          label,
          kind,
          calc_type,
          amount_paise,
          is_statutory,
          percent_of_code
        )
      )
    `)
    .eq("org_id", orgId)
    .eq("is_active", true);

  if (empError || !employees || employees.length === 0) {
    throw new Error(`No active employees found for organization to create payroll run`);
  }

  // 4. Fetch attendance records for this period
  const { data: attendanceRecords } = await supabase
    .from("attendance_records")
    .select("employee_id, work_date, status, worked_minutes, ot_minutes")
    .eq("org_id", orgId)
    .gte("work_date", startDate)
    .lte("work_date", endDate);

  const attendanceMap = new Map<string, AttendanceRow[]>();
  for (const att of attendanceRecords || []) {
    if (!attendanceMap.has(att.employee_id)) {
      attendanceMap.set(att.employee_id, []);
    }
    attendanceMap.get(att.employee_id)!.push({
      workDate: att.work_date,
      status: att.status as any,
      workedMinutes: att.worked_minutes,
      otMinutes: att.ot_minutes,
    });
  }

  // 5. Fetch active advances
  const { data: advances } = await supabase
    .from("advances")
    .select("id, employee_id, amount_paise, recovery_per_month_paise, balance_paise")
    .eq("org_id", orgId);

  const advancesMap = new Map<string, AdvanceInput[]>();
  for (const adv of advances || []) {
    if (BigInt(adv.balance_paise) > 0n) {
      if (!advancesMap.has(adv.employee_id)) {
        advancesMap.set(adv.employee_id, []);
      }
      advancesMap.get(adv.employee_id)!.push({
        id: adv.id,
        amountPaise: BigInt(adv.amount_paise),
        recoveryPerMonthPaise: BigInt(adv.recovery_per_month_paise),
        balancePaise: BigInt(adv.balance_paise),
      });
    }
  }

  // 6. Insert new payroll_runs row in 'draft' status
  const { data: run, error: runInsertError } = await supabase
    .from("payroll_runs")
    .insert({
      org_id: orgId,
      period_month: periodMonth,
      status: "draft",
    })
    .select("id")
    .single();

  if (runInsertError || !run) {
    throw new Error(`Failed to insert payroll run: ${runInsertError?.message}`);
  }

  // 7. Calculate and insert payroll items for each employee
  for (const emp of employees) {
    // Select the active salary structure
    const structures = emp.salary_structures || [];
    const activeStruct = structures.sort(
      (a: any, b: any) =>
        new Date(b.effective_from).getTime() - new Date(a.effective_from).getTime()
    )[0];

    const rawComponents = activeStruct?.salary_components || [];
    const components: SalaryComponentInput[] = rawComponents.map((c: any) => ({
      code: c.code,
      label: c.label,
      kind: c.kind,
      calcType: c.calc_type,
      amountPaise: BigInt(c.amount_paise || 0),
      isStatutory: Boolean(c.is_statutory),
      percentOfCode: c.percent_of_code || undefined,
    }));

    const empInput: EmployeeInput = {
      id: emp.id,
      code: emp.code,
      name: emp.name,
      employmentType: emp.employment_type as any,
      doj: emp.doj,
      dol: emp.dol || undefined,
      isActive: emp.is_active,
    };

    const payrollInput: PayrollInput = {
      employee: empInput,
      components,
      attendance: attendanceMap.get(emp.id) || [],
      advances: advancesMap.get(emp.id) || [],
      period,
      applyStatutory: true,
    };

    // PURE ENGINE EXECUTION
    const result = calculatePayroll(payrollInput);

    // Centi-days to integer days
    const daysPaid = Math.round(Number(result.attendanceSummary.payableCentiDays) / 100);

    // Insert payroll_items row with full snapshot
    const { data: item, error: itemError } = await supabase
      .from("payroll_items")
      .insert({
        org_id: orgId,
        run_id: run.id,
        employee_id: emp.id,
        gross_paise: result.grossPaise.toString(),
        deductions_paise: result.deductionsPaise.toString(),
        net_paise: result.netPaise.toString(),
        days_paid: daysPaid,
        snapshot: serializeBigInts(payrollInput),
      })
      .select("id")
      .single();

    if (itemError || !item) {
      console.error(`Failed to insert payroll item for employee ${emp.code}:`, itemError);
      continue;
    }

    // Insert itemized payroll_item_lines
    if (result.lines && result.lines.length > 0) {
      const lineRows = result.lines.map((line) => ({
        org_id: orgId,
        item_id: item.id,
        component_code: line.componentCode,
        label: line.label,
        kind: line.kind,
        amount_paise: line.amountPaise.toString(),
        explain: line.explain,
      }));

      const { error: lineError } = await supabase
        .from("payroll_item_lines")
        .insert(lineRows);

      if (lineError) {
        console.error(`Failed to insert payroll lines for item ${item.id}:`, lineError);
      }
    }
  }

  // 8. Write audit_log entry
  await supabase.from("audit_log").insert({
    org_id: orgId,
    actor_id: actorId,
    entity: "payroll_runs",
    entity_id: run.id,
    action: "create_draft",
    before: null,
    after: { status: "draft", period_month: periodMonth },
  });

  return { success: true, runId: run.id };
}

/**
 * Transitions a payroll run to a target status with strict validation.
 * Any non-permitted transition throws immediately.
 */
export async function transitionRun(
  runId: string,
  targetStatus: PayrollRunStatus,
  actorId: string,
  options?: TransitionOptions
) {
  const supabase = await createClient();

  // 1. Fetch current run status
  const { data: run, error: runError } = await supabase
    .from("payroll_runs")
    .select("id, org_id, period_month, status, locked_at")
    .eq("id", runId)
    .single();

  if (runError || !run) {
    throw new Error(`Payroll run ${runId} not found`);
  }

  const currentStatus = run.status as PayrollRunStatus;

  // 2. Validate state transition
  const allowed = VALID_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(targetStatus)) {
    throw new Error(
      `Invalid payroll run transition from "${currentStatus}" to "${targetStatus}". Permitted next states: [${allowed.join(", ")}].`
    );
  }

  // 3. Special handling: Transition to 'reversed' delegates to reverseRun
  if (targetStatus === "reversed") {
    return await reverseRun(runId, actorId, options?.reversalReason);
  }

  // 4. Special handling: Transition review -> approved requires pre-run checks
  if (targetStatus === "approved") {
    const checks = await runPreRunChecks(runId);
    const errors = checks.filter((c) => c.severity === "error");
    const warnings = checks.filter((c) => c.severity === "warning");

    if (errors.length > 0) {
      const errorMsg = errors.map((e) => `• ${e.message}`).join("\n");
      throw new Error(
        `Cannot approve payroll run: ${errors.length} error(s) must be resolved first:\n${errorMsg}`
      );
    }

    if (warnings.length > 0) {
      const acked = new Set(options?.acknowledgedWarningCodes || []);
      const unacknowledged = warnings.filter((w) => !acked.has(w.code));
      if (unacknowledged.length > 0) {
        throw new Error(
          `Cannot approve payroll run: ${unacknowledged.length} warning(s) must be acknowledged via tick-box.`
        );
      }
    }
  }

  // 5. Update run status
  const updates: any = { status: targetStatus };
  if (targetStatus === "approved") {
    updates.locked_at = new Date().toISOString();
    updates.approved_by = actorId;
  }

  const { error: updateError } = await supabase
    .from("payroll_runs")
    .update(updates)
    .eq("id", runId);

  if (updateError) {
    throw new Error(`Failed to update payroll run: ${updateError.message}`);
  }

  // 6. Write audit log entry
  await supabase.from("audit_log").insert({
    org_id: run.org_id,
    actor_id: actorId,
    entity: "payroll_runs",
    entity_id: runId,
    action: `transition_${currentStatus}_to_${targetStatus}`,
    before: { status: currentStatus },
    after: { status: targetStatus, locked_at: updates.locked_at || run.locked_at },
  });

  return { success: true, runId, status: targetStatus };
}

/**
 * Reverses an approved or paid payroll run non-destructively.
 * Creates a new run row linked to the original with negated lines and status 'reversed'.
 */
export async function reverseRun(
  originalRunId: string,
  actorId: string,
  reason?: string
) {
  const supabase = await createClient();

  // 1. Fetch original run
  const { data: originalRun, error: origError } = await supabase
    .from("payroll_runs")
    .select("id, org_id, period_month, status")
    .eq("id", originalRunId)
    .single();

  if (origError || !originalRun) {
    throw new Error(`Original payroll run ${originalRunId} not found`);
  }

  if (originalRun.status !== "approved" && originalRun.status !== "paid") {
    throw new Error(
      `Cannot reverse payroll run: only "approved" or "paid" runs can be reversed (current status: "${originalRun.status}").`
    );
  }

  // 2. Fetch all original items and item lines
  const { data: origItems, error: itemsError } = await supabase
    .from("payroll_items")
    .select(`
      id,
      employee_id,
      gross_paise,
      deductions_paise,
      net_paise,
      days_paid,
      snapshot,
      payroll_item_lines (
        id,
        component_code,
        label,
        kind,
        amount_paise,
        explain
      )
    `)
    .eq("run_id", originalRunId);

  if (itemsError || !origItems) {
    throw new Error(`Failed to fetch original payroll items for reversal: ${itemsError?.message}`);
  }

  // 3. Insert new reversal payroll_runs row
  const now = new Date().toISOString();
  const { data: reversalRun, error: revInsertError } = await supabase
    .from("payroll_runs")
    .insert({
      org_id: originalRun.org_id,
      period_month: originalRun.period_month,
      status: "reversed",
      reversal_of_id: originalRun.id,
      reversed_at: now,
      locked_at: now,
      approved_by: actorId,
    })
    .select("id")
    .single();

  if (revInsertError || !reversalRun) {
    throw new Error(`Failed to create reversal payroll run: ${revInsertError?.message}`);
  }

  // 4. Insert negated items and lines
  for (const item of origItems) {
    const grossPaise = -BigInt(item.gross_paise);
    const deductionsPaise = -BigInt(item.deductions_paise);
    const netPaise = -BigInt(item.net_paise);
    const daysPaid = -Number(item.days_paid);

    const { data: revItem, error: revItemError } = await supabase
      .from("payroll_items")
      .insert({
        org_id: originalRun.org_id,
        run_id: reversalRun.id,
        employee_id: item.employee_id,
        gross_paise: grossPaise.toString(),
        deductions_paise: deductionsPaise.toString(),
        net_paise: netPaise.toString(),
        days_paid: daysPaid,
        snapshot: item.snapshot,
      })
      .select("id")
      .single();

    if (revItemError || !revItem) {
      console.error(`Error inserting reversal item for employee ${item.employee_id}:`, revItemError);
      continue;
    }

    // Negate item lines
    const rawLines = item.payroll_item_lines || [];
    if (rawLines.length > 0) {
      const negatedLines = rawLines.map((line: any) => ({
        org_id: originalRun.org_id,
        item_id: revItem.id,
        component_code: line.component_code,
        label: `${line.label} (Reversal)`,
        kind: line.kind,
        amount_paise: (-BigInt(line.amount_paise)).toString(),
        explain: reason
          ? `Reversal (${reason}): ${line.explain}`
          : `Reversal of run ${originalRun.period_month}: ${line.explain}`,
      }));

      await supabase.from("payroll_item_lines").insert(negatedLines);
    }
  }

  // 5. Update original run reversed_at timestamp
  await supabase
    .from("payroll_runs")
    .update({ reversed_at: now })
    .eq("id", originalRun.id);

  // 6. Write audit log entries
  await supabase.from("audit_log").insert({
    org_id: originalRun.org_id,
    actor_id: actorId,
    entity: "payroll_runs",
    entity_id: reversalRun.id,
    action: "create_reversal_run",
    before: null,
    after: {
      status: "reversed",
      reversal_of_id: originalRun.id,
      period_month: originalRun.period_month,
      reason: reason || "Manual reversal",
    },
  });

  return {
    success: true,
    reversalRunId: reversalRun.id,
    originalRunId: originalRun.id,
  };
}
