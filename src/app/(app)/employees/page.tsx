// src/app/(app)/employees/page.tsx
// Server component fetching employee records directly from Supabase.
// Zero mock data imports.

import { getEmployees } from "@/lib/data/employees";
import EmployeeDirectoryClient from "./EmployeeDirectoryClient";

export const dynamic = "force-dynamic";

export default async function EmployeesPage() {
  const employees = await getEmployees();

  return <EmployeeDirectoryClient employees={employees} />;
}
