// src/app/(app)/payroll/review/[id]/loading.tsx
export default function PayrollReviewLoading() {
  return (
    <div className="flex flex-col gap-6 pt-2 pb-36 md:pb-16 max-w-5xl mx-auto animate-pulse">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[var(--surface-raised)]" />
          <div className="flex flex-col gap-2">
            <div className="h-6 w-48 rounded bg-[var(--surface-raised)]" />
            <div className="h-4 w-32 rounded bg-[var(--surface)]" />
          </div>
        </div>
        <div className="h-12 w-44 rounded-2xl bg-[var(--surface-raised)]" />
      </div>

      <div
        className="p-5 rounded-2xl h-48"
        style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
      />

      <div
        className="rounded-2xl h-64"
        style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
      />
    </div>
  );
}
