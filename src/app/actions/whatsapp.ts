// src/app/actions/whatsapp.ts
"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { processSendPayslips, type MessageLogStatus } from "@/server/whatsapp";

export interface WhatsAppConfig {
  templateName: string;
  isConfigured: boolean;
  phoneNumberIdMasked?: string;
  verifyTokenMasked?: string;
  stats: {
    total: number;
    queued: number;
    sent: number;
    delivered: number;
    read: number;
    failed: number;
  };
}

/**
 * Fetch WhatsApp configuration, provider status, and log statistics.
 */
export async function getWhatsAppSettingsAction(): Promise<{
  success: boolean;
  config?: WhatsAppConfig;
  error?: string;
}> {
  try {
    const { org } = await requireRole(["owner", "manager", "accountant"]);
    const supabase = await createClient();

    // 1. Fetch template setting
    const { data: settingRow } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "whatsapp_template_name")
      .maybeSingle();

    let templateName = "payslip_utility";
    if (settingRow?.value) {
      templateName =
        typeof settingRow.value === "string"
          ? settingRow.value
          : String(settingRow.value).replace(/"/g, "");
    }

    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const isConfigured = Boolean(token && phoneId);

    // 2. Fetch message_log stats
    const { data: logs } = await supabase
      .from("message_log")
      .select("status")
      .eq("org_id", org.id);

    const stats = {
      total: logs?.length || 0,
      queued: 0,
      sent: 0,
      delivered: 0,
      read: 0,
      failed: 0,
    };

    if (logs) {
      for (const log of logs) {
        if (log.status in stats) {
          stats[log.status as keyof typeof stats]++;
        }
      }
    }

    return {
      success: true,
      config: {
        templateName,
        isConfigured,
        phoneNumberIdMasked: phoneId ? `•••${phoneId.slice(-4)}` : undefined,
        stats,
      },
    };
  } catch (err: any) {
    console.error("getWhatsAppSettingsAction error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Update the default WhatsApp utility template name.
 */
export async function updateWhatsAppTemplateAction(templateName: string) {
  try {
    await requireRole(["owner", "manager"]);
    const supabase = await createClient();

    const cleanTemplate = templateName.trim().toLowerCase().replace(/\s+/g, "_");
    if (!cleanTemplate) {
      return { success: false, error: "Template name cannot be blank" };
    }

    const { error } = await supabase
      .from("system_settings")
      .upsert({
        key: "whatsapp_template_name",
        value: JSON.stringify(cleanTemplate),
        description: "Default WhatsApp Cloud API approved utility template name",
        updated_at: new Date().toISOString(),
      });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/settings/whatsapp");
    return { success: true, templateName: cleanTemplate };
  } catch (err: any) {
    console.error("updateWhatsAppTemplateAction error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Toggle WhatsApp consent flag for an individual employee.
 */
export async function toggleEmployeeConsentAction(
  employeeId: string,
  consent: boolean
) {
  try {
    const { org } = await requireRole(["owner", "manager"]);
    const supabase = await createClient();

    const { error } = await supabase
      .from("employees")
      .update({
        whatsapp_consent: consent,
        whatsapp_consent_at: consent ? new Date().toISOString() : null,
      })
      .eq("id", employeeId)
      .eq("org_id", org.id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/settings/whatsapp");
    revalidatePath("/employees");
    return { success: true };
  } catch (err: any) {
    console.error("toggleEmployeeConsentAction error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Bulk toggle WhatsApp consent for all employees in the organization.
 */
export async function bulkToggleEmployeeConsentAction(consent: boolean) {
  try {
    const { org } = await requireRole(["owner", "manager"]);
    const supabase = await createClient();

    const { error } = await supabase
      .from("employees")
      .update({
        whatsapp_consent: consent,
        whatsapp_consent_at: consent ? new Date().toISOString() : null,
      })
      .eq("org_id", org.id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/settings/whatsapp");
    return { success: true };
  } catch (err: any) {
    console.error("bulkToggleEmployeeConsentAction error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Send a test payslip to the specified phone number ("send to my own number").
 */
export async function sendTestPayslipAction(
  payrollItemId: string,
  phoneOverride: string
) {
  try {
    const { org } = await requireRole(["owner", "manager"]);
    const supabase = await createClient();

    if (!payrollItemId) {
      return { success: false, error: "Please select a payroll item to test." };
    }
    if (!phoneOverride?.trim()) {
      return { success: false, error: "Please enter your test phone number." };
    }

    const result = await processSendPayslips(supabase, org.id, {
      payrollItemIds: [payrollItemId],
      recipientOverride: phoneOverride.trim(),
      forceConsent: true, // Allow test send to own number
    });

    revalidatePath("/settings/whatsapp");
    return result;
  } catch (err: any) {
    console.error("sendTestPayslipAction error:", err);
    return {
      success: false,
      total: 1,
      sent: 0,
      failed: 1,
      skipped: 0,
      results: [],
      error: err.message,
    };
  }
}

/**
 * Simulate Webhook delivery status transitions ('delivered' | 'read').
 * Used for live verification that the send log transitions through sent -> delivered -> read.
 */
export async function simulateDeliveryStatusAction(
  providerMessageId: string,
  status: "delivered" | "read"
) {
  try {
    const { org } = await requireRole(["owner", "manager"]);
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("message_log")
      .update({ status })
      .eq("provider_message_id", providerMessageId)
      .eq("org_id", org.id)
      .select("id, status");

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/settings/whatsapp");
    return { success: true, updated: data?.length || 0, status };
  } catch (err: any) {
    console.error("simulateDeliveryStatusAction error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Query message log records for the organization.
 */
export async function getMessageLogsAction(statusFilter?: string) {
  try {
    const { org } = await requireRole(["owner", "manager", "accountant"]);
    const supabase = await createClient();

    let query = supabase
      .from("message_log")
      .select(`
        id,
        org_id,
        employee_id,
        payroll_item_id,
        template,
        status,
        provider_message_id,
        error,
        created_at,
        updated_at,
        employees (
          code,
          name,
          phone
        )
      `)
      .eq("org_id", org.id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (statusFilter && statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, error: error.message, logs: [] };
    }

    const formattedLogs = (data || []).map((row: any) => {
      const emp = Array.isArray(row.employees) ? row.employees[0] : row.employees;
      return {
        id: row.id,
        org_id: row.org_id,
        employee_id: row.employee_id,
        payroll_item_id: row.payroll_item_id,
        template: row.template,
        status: row.status as MessageLogStatus,
        provider_message_id: row.provider_message_id,
        error: row.error,
        created_at: row.created_at,
        updated_at: row.updated_at,
        employee_name: emp?.name || "Unknown",
        employee_code: emp?.code || "—",
        employee_phone: emp?.phone || "—",
      };
    });

    return { success: true, logs: formattedLogs };
  } catch (err: any) {
    console.error("getMessageLogsAction error:", err);
    return { success: false, error: err.message, logs: [] };
  }
}
