// src/server/privacy.ts
// Server-side module for Consent Gatekeeping, Data Access Export, and Right to Erasure.

export type ConsentPurpose = "biometric_selfie" | "location" | "whatsapp";

export interface ConsentRecord {
  id: string;
  employee_id: string;
  purpose: ConsentPurpose;
  granted_at: string;
  withdrawn_at: string | null;
  notice_version: string;
}

export interface ErasureRequestRecord {
  id: string;
  org_id: string;
  employee_id: string;
  employee_name?: string;
  employee_code?: string;
  status: "pending" | "approved" | "rejected";
  requested_at: string;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  rejection_reason?: string | null;
  details: Record<string, any>;
}

/**
 * Server-side check verifying whether an employee has an active (non-withdrawn) consent
 * for the specified purpose.
 */
export async function checkConsent(
  supabase: any,
  employeeId: string,
  purpose: ConsentPurpose
): Promise<boolean> {
  // 1. Check consents table
  const { data: activeConsent } = await supabase
    .from("consents")
    .select("id, granted_at, withdrawn_at")
    .eq("employee_id", employeeId)
    .eq("purpose", purpose)
    .is("withdrawn_at", null)
    .order("granted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (activeConsent) {
    return true;
  }

  // 2. Legacy fallback check on employees table
  const { data: emp } = await supabase
    .from("employees")
    .select("selfie_consent_at, whatsapp_consent")
    .eq("id", employeeId)
    .maybeSingle();

  if (!emp) return false;

  if (purpose === "biometric_selfie" && emp.selfie_consent_at) {
    return true;
  }
  if (purpose === "whatsapp" && emp.whatsapp_consent) {
    return true;
  }

  return false;
}

/**
 * Records or withdraws consent for an employee with versioned notice tracking.
 */
export async function recordConsent(
  supabase: any,
  orgId: string,
  employeeId: string,
  purpose: ConsentPurpose,
  granted: boolean,
  noticeVersion: string = "v1.0"
): Promise<{ success: boolean; error?: string }> {
  const now = new Date().toISOString();

  if (granted) {
    // 1. Withdraw any older active records for this purpose
    await supabase
      .from("consents")
      .update({ withdrawn_at: now })
      .eq("employee_id", employeeId)
      .eq("purpose", purpose)
      .is("withdrawn_at", null);

    // 2. Insert new granted consent
    const { error: insertErr } = await supabase.from("consents").insert({
      org_id: orgId,
      employee_id: employeeId,
      purpose,
      granted_at: now,
      withdrawn_at: null,
      notice_version: noticeVersion,
    });

    if (insertErr) return { success: false, error: insertErr.message };

    // Sync legacy columns on employees
    if (purpose === "biometric_selfie") {
      await supabase.from("employees").update({ selfie_consent_at: now }).eq("id", employeeId);
    } else if (purpose === "whatsapp") {
      await supabase.from("employees").update({ whatsapp_consent: true, whatsapp_consent_at: now }).eq("id", employeeId);
    }
  } else {
    // Withdraw consent
    const { error: updateErr } = await supabase
      .from("consents")
      .update({ withdrawn_at: now })
      .eq("employee_id", employeeId)
      .eq("purpose", purpose)
      .is("withdrawn_at", null);

    if (updateErr) return { success: false, error: updateErr.message };

    // Sync legacy columns on employees
    if (purpose === "biometric_selfie") {
      await supabase.from("employees").update({ selfie_consent_at: null }).eq("id", employeeId);
    } else if (purpose === "whatsapp") {
      await supabase.from("employees").update({ whatsapp_consent: false, whatsapp_consent_at: null }).eq("id", employeeId);
    }
  }

  return { success: true };
}

/**
 * Submits an erasure request to the owner's review queue.
 */
export async function submitErasureRequest(
  supabase: any,
  orgId: string,
  employeeId: string,
  details: Record<string, any> = {}
): Promise<{ success: boolean; requestId?: string; error?: string }> {
  // Check if there is already a pending request
  const { data: existing } = await supabase
    .from("erasure_requests")
    .select("id")
    .eq("employee_id", employeeId)
    .eq("status", "pending")
    .maybeSingle();

  if (existing) {
    return {
      success: false,
      error: "An erasure request is already pending review by your organization owner.",
    };
  }

  const { data, error } = await supabase
    .from("erasure_requests")
    .insert({
      org_id: orgId,
      employee_id: employeeId,
      status: "pending",
      details,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, requestId: data.id };
}

/**
 * Processes and executes an approved erasure request.
 * Permanently wipes selfies and location coordinates, anonymises non-statutory personal info,
 * while preserving statutory payroll registers.
 */
export async function executeErasureRequest(
  supabase: any,
  requestId: string,
  reviewerId: string
): Promise<{ success: boolean; result?: any; error?: string }> {
  const { data, error } = await supabase.rpc("process_erasure_request", {
    p_request_id: requestId,
    p_reviewer_id: reviewerId,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, result: data };
}

/**
 * Compiles an employee's personal data bundle (profile, attendance, and payslip history)
 * for the data access download.
 */
export async function compileEmployeeDataExport(
  supabase: any,
  orgId: string,
  employeeId: string
): Promise<{
  profile: Record<string, any>;
  attendanceCsv: string;
  payslipsSummaryCsv: string;
  consentsJson: any[];
}> {
  // 1. Employee profile
  const { data: employee } = await supabase
    .from("employees")
    .select("*")
    .eq("id", employeeId)
    .eq("org_id", orgId)
    .single();

  // 2. Consents history
  const { data: consents } = await supabase
    .from("consents")
    .select("purpose, granted_at, withdrawn_at, notice_version")
    .eq("employee_id", employeeId)
    .order("granted_at", { ascending: false });

  // 3. Attendance records
  const { data: attendance } = await supabase
    .from("attendance_records")
    .select("work_date, status, in_at, out_at, worked_minutes, ot_minutes, source")
    .eq("employee_id", employeeId)
    .eq("org_id", orgId)
    .order("work_date", { ascending: false });

  // 4. Payroll items
  const { data: payrollItems } = await supabase
    .from("payroll_items")
    .select(`
      id,
      gross_paise,
      deductions_paise,
      net_paise,
      days_paid,
      created_at,
      payroll_runs (
        period_month,
        status
      )
    `)
    .eq("employee_id", employeeId)
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  // Format Attendance CSV
  const attendanceHeaders = ["Date", "Status", "In Time", "Out Time", "Worked Minutes", "OT Minutes", "Source"];
  const attendanceRows = (attendance || []).map((r: any) => [
    r.work_date,
    r.status,
    r.in_at ? new Date(r.in_at).toISOString() : "",
    r.out_at ? new Date(r.out_at).toISOString() : "",
    r.worked_minutes,
    r.ot_minutes,
    r.source,
  ]);
  const attendanceCsv = [
    attendanceHeaders.join(","),
    ...attendanceRows.map((row: any[]) => row.join(",")),
  ].join("\n");

  // Format Payslips Summary CSV
  const payslipHeaders = ["Period", "Status", "Gross (INR)", "Deductions (INR)", "Net (INR)", "Days Paid", "Record ID"];
  const payslipRows = (payrollItems || []).map((item: any) => {
    const run = Array.isArray(item.payroll_runs) ? item.payroll_runs[0] : item.payroll_runs;
    return [
      run?.period_month || "",
      run?.status || "",
      (Number(item.gross_paise) / 100).toFixed(2),
      (Number(item.deductions_paise) / 100).toFixed(2),
      (Number(item.net_paise) / 100).toFixed(2),
      item.days_paid,
      item.id,
    ];
  });
  const payslipsSummaryCsv = [
    payslipHeaders.join(","),
    ...payslipRows.map((row: any[]) => row.join(",")),
  ].join("\n");

  return {
    profile: employee || {},
    attendanceCsv,
    payslipsSummaryCsv,
    consentsJson: consents || [],
  };
}
