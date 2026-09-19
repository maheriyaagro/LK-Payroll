// src/app/api/privacy/export/route.ts
// Secure endpoint allowing employees to download their personal data archive as a ZIP file.

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { compileEmployeeDataExport } from "@/server/privacy";
import { createZip, type ZipEntry } from "@/server/zip";
import { renderPayslipPdf } from "@/server/payslipPdf";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { org, member } = await requireRole([
      "owner",
      "manager",
      "accountant",
      "employee",
    ]);

    const url = new URL(request.url);
    const queryEmpId = url.searchParams.get("employee_id");

    let targetEmpId = member.employee_id;
    if (member.role === "owner" || member.role === "manager") {
      if (queryEmpId) {
        targetEmpId = queryEmpId;
      }
    }

    if (!targetEmpId) {
      return NextResponse.json(
        { error: "No employee profile mapped to your account." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // 1. Compile profile, attendance, and payslip data
    const exportData = await compileEmployeeDataExport(supabase, org.id, targetEmpId);
    const empCode = exportData.profile.code || "EMP";

    // 2. Prepare Zip Entries
    const entries: ZipEntry[] = [
      {
        filename: "profile.json",
        data: JSON.stringify(exportData.profile, null, 2),
      },
      {
        filename: "consents.json",
        data: JSON.stringify(exportData.consentsJson, null, 2),
      },
      {
        filename: "attendance.csv",
        data: exportData.attendanceCsv,
      },
      {
        filename: "payslips_summary.csv",
        data: exportData.payslipsSummaryCsv,
      },
      {
        filename: "README.txt",
        data: `Hajri (LK-Payroll) - Personal Data Archive\nGenerated on: ${new Date().toISOString()}\nEmployee Code: ${empCode}\nOrganization: ${org.name}\n\nContents:\n1. profile.json - Complete employee demographic and employment records\n2. consents.json - Audit trail of privacy and biometric consents\n3. attendance.csv - Daily attendance and overtime history\n4. payslips_summary.csv - Historical salary calculation summary\n5. payslips/ - Rendered PDF payslips\n\nNotice: Under statutory accounting and Indian Labour laws, payroll calculation records and statutory filings are retained in accordance with legal requirements.\n`,
      },
    ];

    // 3. Render and attach recent payslip PDFs (up to 3 recent payslips)
    try {
      const { data: recentItems } = await supabase
        .from("payroll_items")
        .select("id, payroll_runs(period_month)")
        .eq("employee_id", targetEmpId)
        .eq("org_id", org.id)
        .order("created_at", { ascending: false })
        .limit(3);

      if (recentItems) {
        for (const item of recentItems) {
          const run = Array.isArray(item.payroll_runs) ? item.payroll_runs[0] : item.payroll_runs;
          const month = run?.period_month || "unknown";
          try {
            const { buffer, filename } = await renderPayslipPdf(item.id);
            entries.push({
              filename: `payslips/${filename || `payslip-${month}.pdf`}`,
              data: buffer,
            });
          } catch (pdfErr) {
            console.warn(`Could not render payslip PDF for item ${item.id}:`, pdfErr);
          }
        }
      }
    } catch (e) {
      console.warn("Payslip PDF batch fetch error:", e);
    }

    // 4. Create ZIP
    const zipBuffer = createZip(entries);
    const dateStr = new Date().toISOString().split("T")[0];
    const zipFilename = `hajri-data-export-${empCode}-${dateStr}.zip`;

    return new Response(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${zipFilename}"`,
        "Content-Length": zipBuffer.length.toString(),
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (err: any) {
    console.error("Data export error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to generate personal data export" },
      { status: 500 }
    );
  }
}
