// src/app/actions/privacy.ts
"use server";

import { revalidatePath } from "next/cache";
import { requireRole, getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  recordConsent,
  submitErasureRequest,
  executeErasureRequest,
  type ConsentPurpose,
} from "@/server/privacy";

/**
 * Retrieves privacy context for current user / employee:
 * - Current consents (biometric_selfie, location, whatsapp)
 * - Own erasure requests
 * - If owner/manager: organization pending erasure request queue
 */
export async function getPrivacyContextAction(targetEmployeeId?: string) {
  try {
    const { user, org, member } = await requireRole([
      "owner",
      "manager",
      "accountant",
      "employee",
    ]);
    const supabase = await createClient();

    let empId = targetEmployeeId;
    if (member.role === "employee") {
      empId = member.employee_id || undefined;
    } else if (!empId && member.employee_id) {
      empId = member.employee_id;
    }

    // 1. Fetch current employee details if resolved
    let employee = null;
    if (empId) {
      const { data } = await supabase
        .from("employees")
        .select("id, code, name, phone, department, designation, selfie_consent_at, whatsapp_consent, is_active")
        .eq("id", empId)
        .eq("org_id", org.id)
        .maybeSingle();
      employee = data;
    }

    // 2. Fetch active consents for this employee
    const consentsMap: Record<ConsentPurpose, { granted: boolean; grantedAt?: string; noticeVersion?: string }> = {
      biometric_selfie: { granted: false },
      location: { granted: false },
      whatsapp: { granted: false },
    };

    if (empId) {
      const { data: consents } = await supabase
        .from("consents")
        .select("purpose, granted_at, withdrawn_at, notice_version")
        .eq("employee_id", empId)
        .is("withdrawn_at", null);

      if (consents) {
        for (const c of consents) {
          const p = c.purpose as ConsentPurpose;
          if (p in consentsMap) {
            consentsMap[p] = {
              granted: true,
              grantedAt: c.granted_at,
              noticeVersion: c.notice_version,
            };
          }
        }
      }

      // Check legacy flags if consents table row not present
      if (!consentsMap.biometric_selfie.granted && employee?.selfie_consent_at) {
        consentsMap.biometric_selfie = { granted: true, grantedAt: employee.selfie_consent_at };
      }
      if (!consentsMap.whatsapp.granted && employee?.whatsapp_consent) {
        consentsMap.whatsapp = { granted: true };
      }
    }

    // 3. Fetch employee's erasure request history
    let myErasureRequests: any[] = [];
    if (empId) {
      const { data } = await supabase
        .from("erasure_requests")
        .select("*")
        .eq("employee_id", empId)
        .order("created_at", { ascending: false });
      myErasureRequests = data || [];
    }

    // 4. For Owners / Managers: Fetch organization pending erasure queue
    let orgPendingQueue: any[] = [];
    if (member.role === "owner" || member.role === "manager") {
      const { data } = await supabase
        .from("erasure_requests")
        .select(`
          id,
          org_id,
          employee_id,
          status,
          requested_at,
          rejection_reason,
          details,
          employees (
            id,
            code,
            name,
            phone,
            department
          )
        `)
        .eq("org_id", org.id)
        .order("created_at", { ascending: false });

      orgPendingQueue = (data || []).map((row: any) => {
        const emp = Array.isArray(row.employees) ? row.employees[0] : row.employees;
        return {
          id: row.id,
          employeeId: row.employee_id,
          employeeName: emp?.name || "Unknown",
          employeeCode: emp?.code || "—",
          employeePhone: emp?.phone || "—",
          employeeDept: emp?.department || "—",
          status: row.status,
          requestedAt: row.requested_at,
          rejectionReason: row.rejection_reason,
          details: row.details,
        };
      });
    }

    // 5. Retention policies
    const { data: policies } = await supabase
      .from("data_retention_policies")
      .select("*")
      .order("data_type", { ascending: true });

    return {
      success: true,
      org,
      member,
      employee,
      consents: consentsMap,
      myErasureRequests,
      orgPendingQueue,
      retentionPolicies: policies || [],
    };
  } catch (err: any) {
    console.error("getPrivacyContextAction error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Toggle employee consent for a given purpose.
 */
export async function toggleConsentAction(
  employeeId: string,
  purpose: ConsentPurpose,
  granted: boolean,
  noticeVersion: string = "v1.0"
) {
  try {
    const { org, member } = await requireRole(["owner", "manager", "employee"]);
    const supabase = await createClient();

    // If employee role, ensure they only modify their own consent
    if (member.role === "employee" && member.employee_id !== employeeId) {
      return { success: false, error: "Forbidden: You can only manage your own consent." };
    }

    const res = await recordConsent(supabase, org.id, employeeId, purpose, granted, noticeVersion);
    if (!res.success) {
      return { success: false, error: res.error };
    }

    revalidatePath("/privacy");
    revalidatePath("/punch");
    revalidatePath("/settings/whatsapp");
    return { success: true };
  } catch (err: any) {
    console.error("toggleConsentAction error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Submit an erasure request for an employee.
 */
export async function submitErasureRequestAction(employeeId: string, reason?: string) {
  try {
    const { org, member } = await requireRole(["owner", "manager", "employee"]);
    const supabase = await createClient();

    if (member.role === "employee" && member.employee_id !== employeeId) {
      return { success: false, error: "Forbidden: You can only request erasure for yourself." };
    }

    const res = await submitErasureRequest(supabase, org.id, employeeId, {
      reason: reason?.trim() || "Employee requested account and biometric erasure",
      requestedByRole: member.role,
      requestedAt: new Date().toISOString(),
    });

    if (!res.success) {
      return { success: false, error: res.error };
    }

    revalidatePath("/privacy");
    return { success: true, requestId: res.requestId };
  } catch (err: any) {
    console.error("submitErasureRequestAction error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Approve an erasure request (Owner only).
 * Executes deletion of biometric selfies and location history, anonymises non-statutory info,
 * and preserves statutory payroll records.
 */
export async function approveErasureRequestAction(requestId: string) {
  try {
    const { user } = await requireRole(["owner"]);
    const supabase = await createClient();

    const res = await executeErasureRequest(supabase, requestId, user.id);
    if (!res.success) {
      return { success: false, error: res.error };
    }

    revalidatePath("/privacy");
    revalidatePath("/employees");
    return { success: true, result: res.result };
  } catch (err: any) {
    console.error("approveErasureRequestAction error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Reject an erasure request (Owner only).
 */
export async function rejectErasureRequestAction(requestId: string, reason: string) {
  try {
    const { user, org } = await requireRole(["owner"]);
    const supabase = await createClient();

    if (!reason?.trim()) {
      return { success: false, error: "Please provide a reason for rejecting the erasure request." };
    }

    const { error } = await supabase
      .from("erasure_requests")
      .update({
        status: "rejected",
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        rejection_reason: reason.trim(),
      })
      .eq("id", requestId)
      .eq("org_id", org.id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/privacy");
    return { success: true };
  } catch (err: any) {
    console.error("rejectErasureRequestAction error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Update retention policy days (Owner only).
 */
export async function updateRetentionPolicyAction(dataType: string, retentionDays: number) {
  try {
    const { org } = await requireRole(["owner"]);
    const supabase = await createClient();

    if (!retentionDays || retentionDays <= 0) {
      return { success: false, error: "Retention days must be a positive integer." };
    }

    const { error } = await supabase
      .from("data_retention_policies")
      .upsert({
        org_id: org.id,
        data_type: dataType,
        retention_days: retentionDays,
        updated_at: new Date().toISOString(),
      }, { onConflict: "org_id,data_type" });

    if (error) return { success: false, error: error.message };

    revalidatePath("/privacy");
    return { success: true };
  } catch (err: any) {
    console.error("updateRetentionPolicyAction error:", err);
    return { success: false, error: err.message };
  }
}
