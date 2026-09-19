// src/app/api/edge-functions/send-payslip/route.ts
// Next.js route handler mirroring the send-payslip edge function,
// enabling direct invocation from the app, tests, and API consumers.

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { processSendPayslips } from "@/server/whatsapp";

export async function POST(request: Request) {
  try {
    const { org } = await requireRole(["owner", "manager", "accountant"]);
    const body = await request.json().catch(() => ({}));

    const payrollItemIds = body.payroll_item_ids || body.payrollItemIds || [];
    const templateName = body.template_name || body.templateName;
    const recipientOverride = body.recipient_override || body.recipientOverride;
    const forceConsent = Boolean(body.force_consent || body.forceConsent);

    const supabase = await createClient();

    const result = await processSendPayslips(supabase, org.id, {
      payrollItemIds,
      templateName,
      recipientOverride,
      forceConsent,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("send-payslip route error:", err);
    const status = err.message?.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json({ success: false, error: err.message }, { status });
  }
}
