// src/app/(app)/employees/error.tsx
"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function EmployeesError({ error, reset }: Props) {
  useEffect(() => {
    console.error("Employees page error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6">
      <div
        className="flex items-center justify-center w-16 h-16 rounded-full mb-4"
        style={{
          backgroundColor: "color-mix(in srgb, var(--negative) 15%, transparent)",
          color: "var(--negative)",
        }}
      >
        <AlertTriangle size={32} />
      </div>

      <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)" }}>
        Failed to Load Employees
      </h1>

      <p className="text-caption mt-2 mb-6 max-w-md" style={{ color: "var(--text-muted)" }}>
        {error.message || "An unexpected error occurred while communicating with the database."}
      </p>

      <button
        onClick={() => reset()}
        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold cursor-pointer transition-transform active:scale-95"
        style={{ backgroundColor: "var(--accent)", color: "#FFFFFF" }}
      >
        <RotateCcw size={16} />
        <span>Try Again</span>
      </button>
    </div>
  );
}
