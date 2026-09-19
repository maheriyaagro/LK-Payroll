// src/app/(app)/employees/[id]/edit/page.tsx
// Server component fetching employee by ID from Supabase for editing.

import Link from "next/link";
import { ArrowLeft, UserX } from "lucide-react";
import { getEmployeeById } from "@/lib/data/employees";
import EditEmployeeClient from "./EditEmployeeClient";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditEmployeePage({ params }: Props) {
  const { id } = await params;
  const employee = await getEmployeeById(id);

  if (!employee) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6">
        <div
          className="flex items-center justify-center w-16 h-16 rounded-full mb-4"
          style={{ backgroundColor: "var(--surface)", color: "var(--text-muted)" }}
        >
          <UserX size={32} />
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)" }}>
          Employee Not Found
        </h1>
        <p className="text-caption mt-1 mb-6" style={{ color: "var(--text-muted)" }}>
          The requested employee record could not be found or has been removed.
        </p>
        <Link
          href="/employees"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold"
          style={{ backgroundColor: "var(--accent)", color: "#FFFFFF" }}
        >
          <ArrowLeft size={16} />
          <span>Back to Employee List</span>
        </Link>
      </div>
    );
  }

  return <EditEmployeeClient employee={employee} />;
}
