// src/app/actions/payroll.ts
"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import {
  createDraftRun,
  transitionRun,
  reverseRun,
  type PayrollRunStatus,
} from "@/server/payrollRun";

export async function createDraftAction(periodMonth: string) {
  try {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(periodMonth)) {
      return { success: false, error: "Invalid period month format. Expected YYYY-MM." };
    }

    const { user, org } = await requireRole(["owner", "manager"]);
    const res = await createDraftRun(org.id, periodMonth, user.id);
    revalidatePath("/payroll");
    return { success: true, runId: res.runId };
  } catch (err: any) {
    console.error("createDraftAction error:", err);
    return { success: false, error: err.message };
  }
}

export async function transitionRunAction(
  runId: string,
  targetStatus: PayrollRunStatus,
  options?: { acknowledgedWarningCodes?: string[]; reason?: string }
) {
  try {
    // Only owner can approve or pay
    const requiredRoles = targetStatus === "approved" || targetStatus === "paid" || targetStatus === "reversed"
      ? ["owner"]
      : ["owner", "manager"];

    const { user } = await requireRole(requiredRoles as any);
    const res = await transitionRun(runId, targetStatus, user.id, options);
    revalidatePath("/payroll");
    revalidatePath(`/payroll/review/${runId}`);
    if ("reversalRunId" in res) {
      return { success: true, runId: res.originalRunId, reversalRunId: res.reversalRunId, status: "reversed" as const };
    }
    return { success: true, runId: res.runId, status: res.status };
  } catch (err: any) {
    console.error("transitionRunAction error:", err);
    return { success: false, error: err.message };
  }
}

export async function reverseRunAction(runId: string, reason?: string) {
  try {
    const { user } = await requireRole(["owner"]);
    const res = await reverseRun(runId, user.id, reason);
    revalidatePath("/payroll");
    return { success: true, reversalRunId: res.reversalRunId };
  } catch (err: any) {
    console.error("reverseRunAction error:", err);
    return { success: false, error: err.message };
  }
}

export async function getRunForPeriodAction(periodMonth: string) {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const { getCurrentOrg } = await import("@/lib/auth");
    const supabase = await createClient();
    const orgResult = await getCurrentOrg();

    let targetOrgId = orgResult?.org?.id;
    if (!targetOrgId) {
      const { data: org } = await supabase.from("organizations").select("id").limit(1).maybeSingle();
      targetOrgId = org?.id;
    }

    if (!targetOrgId) return { runs: [] };

    const { data: runs } = await supabase
      .from("payroll_runs")
      .select("id, org_id, period_month, status, locked_at, reversal_of_id, created_at")
      .eq("org_id", targetOrgId)
      .eq("period_month", periodMonth)
      .order("created_at", { ascending: false });

    return { runs: runs || [] };
  } catch (err: any) {
    console.error("getRunForPeriodAction error:", err);
    return { runs: [], error: err.message };
  }
}
