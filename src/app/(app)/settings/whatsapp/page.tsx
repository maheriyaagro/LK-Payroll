// src/app/(app)/settings/whatsapp/page.tsx
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import WhatsAppSettingsClient from "./WhatsAppSettingsClient";

export const dynamic = "force-dynamic";

export default async function WhatsAppSettingsPage() {
  const { org, member } = await requireRole(["owner", "manager", "accountant"]);
  const supabase = await createClient();

  // 1. Fetch template setting
  const { data: settingRow } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", "whatsapp_template_name")
    .maybeSingle();

  let initialTemplateName = "payslip_utility";
  if (settingRow?.value) {
    initialTemplateName =
      typeof settingRow.value === "string"
        ? settingRow.value
        : String(settingRow.value).replace(/"/g, "");
  }

  // 2. Fetch employees with consent status
  const { data: employees } = await supabase
    .from("employees")
    .select("id, code, name, phone, department, designation, whatsapp_consent, whatsapp_consent_at")
    .eq("org_id", org.id)
    .order("name", { ascending: true });

  // 3. Fetch payroll items from approved or paid runs for test payslip selection
  const { data: payrollItems } = await supabase
    .from("payroll_items")
    .select(`
      id,
      net_paise,
      created_at,
      employees (
        id,
        code,
        name,
        phone
      ),
      payroll_runs!inner (
        id,
        period_month,
        status
      )
    `)
    .eq("org_id", org.id)
    .in("payroll_runs.status", ["approved", "paid"])
    .order("created_at", { ascending: false })
    .limit(30);

  // 4. Fetch recent message logs
  const { data: logs } = await supabase
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

  const formattedLogs = (logs || []).map((row: any) => {
    const emp = Array.isArray(row.employees) ? row.employees[0] : row.employees;
    return {
      id: row.id,
      org_id: row.org_id,
      employee_id: row.employee_id,
      payroll_item_id: row.payroll_item_id,
      template: row.template,
      status: row.status,
      provider_message_id: row.provider_message_id,
      error: row.error,
      created_at: row.created_at,
      updated_at: row.updated_at,
      employee_name: emp?.name || "Unknown",
      employee_code: emp?.code || "—",
      employee_phone: emp?.phone || "—",
    };
  });

  const formattedItems = (payrollItems || []).map((item: any) => {
    const emp = Array.isArray(item.employees) ? item.employees[0] : item.employees;
    const run = Array.isArray(item.payroll_runs) ? item.payroll_runs[0] : item.payroll_runs;
    return {
      id: item.id,
      netPaise: item.net_paise,
      employeeName: emp?.name || "Employee",
      employeeCode: emp?.code || "",
      employeePhone: emp?.phone || "",
      periodMonth: run?.period_month || "",
      status: run?.status || "",
    };
  });

  const isConfigured = Boolean(
    process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID
  );

  return (
    <WhatsAppSettingsClient
      initialTemplateName={initialTemplateName}
      initialEmployees={employees || []}
      initialPayrollItems={formattedItems}
      initialLogs={formattedLogs}
      isConfigured={isConfigured}
      userRole={member.role}
    />
  );
}
