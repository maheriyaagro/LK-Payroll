// src/app/actions/employees.ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";

export interface CreateEmployeePayload {
  name: string;
  phone?: string;
  department?: string;
  designation?: string;
  employment_type: "monthly" | "daily" | "hourly" | "contract";
  doj: string;
  base_wage_paise: number; // integer paise
  bank_account_masked?: string;
  pf_uan?: string;
  esi_ic?: string;
}

export interface UpdateEmployeePayload {
  name: string;
  phone?: string;
  department?: string;
  designation?: string;
  employment_type: "monthly" | "daily" | "hourly" | "contract";
  is_active: boolean;
  base_wage_paise: number; // integer paise
  bank_account_masked?: string;
  pf_uan?: string;
  esi_ic?: string;
}

/**
 * Server action to create an employee and initial salary structure/components.
 * Guarded by requireRole(['owner', 'manager']).
 */
export async function createEmployeeAction(payload: CreateEmployeePayload) {
  const { org } = await requireRole(["owner", "manager"]);
  const supabase = await createClient();

  if (!payload.name?.trim()) {
    return { success: false, error: "Employee name is required" };
  }

  const validTypes = ["monthly", "daily", "hourly", "contract"];
  if (!validTypes.includes(payload.employment_type)) {
    return { success: false, error: "Invalid employment type" };
  }

  if (typeof payload.base_wage_paise !== "number" || payload.base_wage_paise < 0) {
    return { success: false, error: "Base wage must be a non-negative number in paise" };
  }

  if (payload.phone && !/^\+?[0-9\s-]{10,15}$/.test(payload.phone.trim())) {
    return { success: false, error: "Invalid phone number format" };
  }

  // Generate employee code: count existing employees in org
  const { count } = await supabase
    .from("employees")
    .select("id", { count: "exact", head: true })
    .eq("org_id", org.id);

  const nextNum = (count || 0) + 1;
  const code = `EMP${String(nextNum).padStart(3, "0")}`;

  // 1. Insert employee
  const { data: newEmp, error: empError } = await supabase
    .from("employees")
    .insert({
      org_id: org.id,
      code,
      name: payload.name.trim(),
      phone: payload.phone?.trim() || null,
      doj: payload.doj || new Date().toISOString().split("T")[0],
      department: payload.department?.trim() || "General",
      designation: payload.designation?.trim() || "Worker",
      employment_type: payload.employment_type,
      pf_uan: payload.pf_uan?.trim() || null,
      esi_ic: payload.esi_ic?.trim() || null,
      bank_account_masked: payload.bank_account_masked?.trim() || null,
      is_active: true,
    })
    .select("id")
    .single();

  if (empError || !newEmp) {
    console.error("Error inserting employee:", empError);
    return { success: false, error: empError?.message || "Failed to create employee" };
  }

  // 2. Insert salary structure
  const { data: struct, error: structError } = await supabase
    .from("salary_structures")
    .insert({
      org_id: org.id,
      employee_id: newEmp.id,
      effective_from: payload.doj || new Date().toISOString().split("T")[0],
    })
    .select("id")
    .single();

  if (structError || !struct) {
    console.error("Error inserting salary structure:", structError);
    return { success: false, error: structError?.message || "Failed to create salary structure" };
  }

  // 3. Insert primary salary component with integer paise
  const wagePaise = Math.round(Number(payload.base_wage_paise) || 0);
  let compCode = "BASIC";
  let compLabel = "Basic Wage";

  if (payload.employment_type === "daily") {
    compCode = "DAILY_WAGE";
    compLabel = "Daily Wage Base";
  } else if (payload.employment_type === "hourly") {
    compCode = "HOURLY_RATE";
    compLabel = "Hourly Rate Base";
  } else if (payload.employment_type === "contract") {
    compCode = "RETAINER";
    compLabel = "Professional Retainer Fee";
  }

  const { error: compError } = await supabase.from("salary_components").insert({
    org_id: org.id,
    structure_id: struct.id,
    code: compCode,
    label: compLabel,
    kind: "earning",
    calc_type: "fixed",
    amount_paise: wagePaise,
    is_statutory: false,
  });

  if (compError) {
    console.error("Error inserting salary component:", compError);
  }

  revalidatePath("/employees");
  revalidatePath("/more");

  return { success: true, employeeId: newEmp.id };
}

/**
 * Server action to update an existing employee.
 * Guarded by requireRole(['owner', 'manager']).
 */
export async function updateEmployeeAction(employeeId: string, payload: UpdateEmployeePayload) {
  const { org } = await requireRole(["owner", "manager"]);
  const supabase = await createClient();

  if (!payload.name?.trim()) {
    return { success: false, error: "Employee name is required" };
  }

  // 1. Update employee record
  const { error: empError } = await supabase
    .from("employees")
    .update({
      name: payload.name.trim(),
      phone: payload.phone?.trim() || null,
      department: payload.department?.trim() || null,
      designation: payload.designation?.trim() || null,
      employment_type: payload.employment_type,
      is_active: payload.is_active,
      pf_uan: payload.pf_uan?.trim() || null,
      esi_ic: payload.esi_ic?.trim() || null,
      bank_account_masked: payload.bank_account_masked?.trim() || null,
    })
    .eq("id", employeeId)
    .eq("org_id", org.id);

  if (empError) {
    console.error("Error updating employee:", empError);
    return { success: false, error: empError.message };
  }

  // 2. Update primary wage in active salary structure
  const { data: structures } = await supabase
    .from("salary_structures")
    .select("id, effective_from")
    .eq("employee_id", employeeId)
    .eq("org_id", org.id)
    .order("effective_from", { ascending: false })
    .limit(1);

  if (structures && structures.length > 0) {
    const structId = structures[0].id;
    const wagePaise = Math.round(Number(payload.base_wage_paise) || 0);

    // Update the main earning component
    const { data: components } = await supabase
      .from("salary_components")
      .select("id, code")
      .eq("structure_id", structId)
      .eq("kind", "earning");

    if (components && components.length > 0) {
      await supabase
        .from("salary_components")
        .update({ amount_paise: wagePaise })
        .eq("id", components[0].id);
    }
  }

  revalidatePath("/employees");
  revalidatePath(`/employees/${employeeId}/edit`);
  revalidatePath("/more");

  return { success: true };
}
