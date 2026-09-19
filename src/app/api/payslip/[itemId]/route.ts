// src/app/api/payslip/[itemId]/route.ts
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { renderPayslipPdf } from "@/server/payslipPdf";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    // 1. Authorize caller
    const { org, member } = await requireRole([
      "owner",
      "manager",
      "accountant",
      "employee",
    ]);

    const resolvedParams = await params;
    const itemId = resolvedParams.itemId;

    if (!itemId) {
      return NextResponse.json(
        { error: "Invalid payroll item ID" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    let targetItemId = itemId;
    let targetEmployeeId = "";
    let itemOrgId = org.id;

    // 2. Check by payroll_items.id first
    const { data: item } = await supabase
      .from("payroll_items")
      .select("id, org_id, employee_id")
      .eq("id", itemId)
      .maybeSingle();

    if (item) {
      targetItemId = item.id;
      targetEmployeeId = item.employee_id;
      itemOrgId = item.org_id;
    } else {
      // 3. Fallback: check if itemId is an employee_id
      const { data: empItem } = await supabase
        .from("payroll_items")
        .select("id, org_id, employee_id")
        .eq("employee_id", itemId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (empItem) {
        targetItemId = empItem.id;
        targetEmployeeId = empItem.employee_id;
        itemOrgId = empItem.org_id;
      } else {
        // Check employees table by id or code
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(itemId);
        let empQuery = supabase.from("employees").select("id, org_id, code");
        if (isUuid) {
          empQuery = empQuery.eq("id", itemId);
        } else {
          empQuery = empQuery.eq("code", itemId);
        }
        const { data: emp } = await empQuery.maybeSingle();

        if (emp) {
          targetEmployeeId = emp.id;
          itemOrgId = emp.org_id;
        } else {
          return NextResponse.json(
            { error: "Payroll item not found" },
            { status: 404 }
          );
        }
      }
    }

    // 4. Multi-tenant isolation: Must belong to caller's org
    if (itemOrgId !== org.id) {
      return NextResponse.json(
        { error: "Forbidden: Cross-organization access is strictly blocked." },
        { status: 403 }
      );
    }

    // 5. Employee isolation: Employees can fetch ONLY their own payslip
    if (member.role === "employee") {
      if (!member.employee_id || member.employee_id !== targetEmployeeId) {
        return NextResponse.json(
          { error: "Forbidden: You are only authorized to download your own payslip." },
          { status: 403 }
        );
      }
    }

    // 6. Generate Payslip PDF (Strictly stored data, no recalculation)
    const { buffer, filename } = await renderPayslipPdf(targetItemId);

    // 7. Return PDF with Content-Disposition attachment
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (err: any) {
    console.error("Payslip PDF Route Error:", err);
    const status = err.message?.includes("Unauthorized")
      ? 401
      : err.message?.includes("Forbidden")
      ? 403
      : 500;
    return NextResponse.json(
      { error: err.message || "Failed to generate payslip PDF" },
      { status }
    );
  }
}
