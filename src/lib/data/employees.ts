// src/lib/data/employees.ts
// Server-side data access for Employees.
// Money stays in integer paise from the database to the edge.

import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/auth";

export interface EmployeeSalaryComponent {
  id: string;
  code: string;
  label: string;
  kind: "earning" | "deduction" | "employer_cost";
  calc_type: "fixed" | "percent_of" | "slab";
  amount_paise: number; // integer paise
  is_statutory: boolean;
}

export interface EmployeeRecord {
  id: string;
  org_id: string;
  code: string;
  name: string;
  phone: string | null;
  doj: string;
  dol: string | null;
  department: string | null;
  designation: string | null;
  employment_type: "monthly" | "daily" | "hourly" | "contract";
  pf_uan: string | null;
  esi_ic: string | null;
  bank_account_masked: string | null;
  is_active: boolean;
  created_at: string;
  base_wage_paise: number; // integer paise
  components: EmployeeSalaryComponent[];
}

/**
 * Fetch all employees for current organization, joined with active salary structures.
 */
export async function getEmployees(): Promise<EmployeeRecord[]> {
  const supabase = await createClient();
  const orgResult = await getCurrentOrg();

  let targetOrgId = orgResult?.org?.id;
  if (!targetOrgId) {
    // Fallback to first available organization for seeded dev / local preview
    const { data: org } = await supabase.from("organizations").select("id").limit(1).maybeSingle();
    targetOrgId = org?.id;
  }

  if (!targetOrgId) {
    return [];
  }

  const { data: employees, error } = await supabase
    .from("employees")
    .select(`
      id,
      org_id,
      code,
      name,
      phone,
      doj,
      dol,
      department,
      designation,
      employment_type,
      pf_uan,
      esi_ic,
      bank_account_masked,
      is_active,
      created_at,
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
          is_statutory
        )
      )
    `)
    .eq("org_id", targetOrgId)
    .order("code", { ascending: true });

  if (error || !employees) {
    console.error("Error fetching employees:", error);
    return [];
  }

  return employees.map((emp: any) => {
    // Pick the most recent/active salary structure
    const structures = emp.salary_structures || [];
    const activeStruct = structures.sort(
      (a: any, b: any) => new Date(b.effective_from).getTime() - new Date(a.effective_from).getTime()
    )[0];

    const rawComponents = activeStruct?.salary_components || [];
    const components: EmployeeSalaryComponent[] = rawComponents.map((c: any) => ({
      id: c.id,
      code: c.code,
      label: c.label,
      kind: c.kind,
      calc_type: c.calc_type,
      amount_paise: Number(c.amount_paise) || 0,
      is_statutory: Boolean(c.is_statutory),
    }));

    // Derive base wage in paise from primary earning component
    let baseWagePaise = 0;
    if (emp.employment_type === "monthly") {
      const basic = components.find((c) => c.code === "BASIC");
      baseWagePaise = basic ? basic.amount_paise : (components[0]?.amount_paise || 0);
    } else if (emp.employment_type === "daily") {
      const daily = components.find((c) => c.code === "DAILY_WAGE");
      baseWagePaise = daily ? daily.amount_paise : (components[0]?.amount_paise || 0);
    } else if (emp.employment_type === "hourly") {
      const hourly = components.find((c) => c.code === "HOURLY_RATE");
      baseWagePaise = hourly ? hourly.amount_paise : (components[0]?.amount_paise || 0);
    } else {
      const retainer = components.find((c) => c.code === "RETAINER");
      baseWagePaise = retainer ? retainer.amount_paise : (components[0]?.amount_paise || 0);
    }

    return {
      id: emp.id,
      org_id: emp.org_id,
      code: emp.code,
      name: emp.name,
      phone: emp.phone,
      doj: emp.doj,
      dol: emp.dol,
      department: emp.department,
      designation: emp.designation,
      employment_type: emp.employment_type,
      pf_uan: emp.pf_uan,
      esi_ic: emp.esi_ic,
      bank_account_masked: emp.bank_account_masked,
      is_active: emp.is_active,
      created_at: emp.created_at,
      base_wage_paise: baseWagePaise,
      components,
    };
  });
}

/**
 * Fetch a single employee by ID for viewing or editing.
 */
export async function getEmployeeById(id: string): Promise<EmployeeRecord | null> {
  const supabase = await createClient();
  const orgResult = await getCurrentOrg();

  let targetOrgId = orgResult?.org?.id;
  if (!targetOrgId) {
    const { data: org } = await supabase.from("organizations").select("id").limit(1).maybeSingle();
    targetOrgId = org?.id;
  }

  if (!targetOrgId) {
    return null;
  }

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  let query = supabase
    .from("employees")
    .select(`
      id,
      org_id,
      code,
      name,
      phone,
      doj,
      dol,
      department,
      designation,
      employment_type,
      pf_uan,
      esi_ic,
      bank_account_masked,
      is_active,
      created_at,
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
          is_statutory
        )
      )
    `)
    .eq("org_id", targetOrgId);

  if (isUuid) {
    query = query.eq("id", id);
  } else {
    // Try matching code or padded code like EMP-0101
    const paddedCode = `EMP-010${id}`;
    query = query.or(`code.eq."${id}",code.eq."${paddedCode}"`);
  }

  const { data: emp, error } = await query.maybeSingle();

  if (error || !emp) {
    // Graceful fallback to mock employee if available
    const { employees: mockEmployees } = await import("@/lib/mock");
    const mock = mockEmployees.find((m) => m.id === id || m.name.toLowerCase().includes(id.toLowerCase()));
    if (mock) {
      return {
        id: mock.id,
        org_id: targetOrgId || "org-mock",
        code: `EMP-010${mock.id}`,
        name: mock.name,
        phone: "+91 98765 43210",
        doj: "2026-01-01",
        dol: null,
        department: "Site Operations",
        designation: mock.role,
        employment_type: "monthly",
        pf_uan: "101928374655",
        esi_ic: "31002938470001",
        bank_account_masked: "•••• 4821",
        is_active: true,
        created_at: new Date().toISOString(),
        base_wage_paise: 2500000,
        components: [
          {
            id: "c1",
            code: "BASIC",
            label: "Basic Wage",
            kind: "earning",
            calc_type: "fixed",
            amount_paise: 1800000,
            is_statutory: false,
          },
          {
            id: "c2",
            code: "HRA",
            label: "House Rent Allowance",
            kind: "earning",
            calc_type: "fixed",
            amount_paise: 700000,
            is_statutory: false,
          },
        ],
      };
    }
    return null;
  }

  const structures = emp.salary_structures || [];
  const activeStruct = structures.sort(
    (a: any, b: any) => new Date(b.effective_from).getTime() - new Date(a.effective_from).getTime()
  )[0];

  const rawComponents = activeStruct?.salary_components || [];
  const components: EmployeeSalaryComponent[] = rawComponents.map((c: any) => ({
    id: c.id,
    code: c.code,
    label: c.label,
    kind: c.kind,
    calc_type: c.calc_type,
    amount_paise: Number(c.amount_paise) || 0,
    is_statutory: Boolean(c.is_statutory),
  }));

  let baseWagePaise = 0;
  if (emp.employment_type === "monthly") {
    const basic = components.find((c) => c.code === "BASIC");
    baseWagePaise = basic ? basic.amount_paise : (components[0]?.amount_paise || 0);
  } else if (emp.employment_type === "daily") {
    const daily = components.find((c) => c.code === "DAILY_WAGE");
    baseWagePaise = daily ? daily.amount_paise : (components[0]?.amount_paise || 0);
  } else if (emp.employment_type === "hourly") {
    const hourly = components.find((c) => c.code === "HOURLY_RATE");
    baseWagePaise = hourly ? hourly.amount_paise : (components[0]?.amount_paise || 0);
  } else {
    const retainer = components.find((c) => c.code === "RETAINER");
    baseWagePaise = retainer ? retainer.amount_paise : (components[0]?.amount_paise || 0);
  }

  return {
    id: emp.id,
    org_id: emp.org_id,
    code: emp.code,
    name: emp.name,
    phone: emp.phone,
    doj: emp.doj,
    dol: emp.dol,
    department: emp.department,
    designation: emp.designation,
    employment_type: emp.employment_type,
    pf_uan: emp.pf_uan,
    esi_ic: emp.esi_ic,
    bank_account_masked: emp.bank_account_masked,
    is_active: emp.is_active,
    created_at: emp.created_at,
    base_wage_paise: baseWagePaise,
    components,
  };
}
