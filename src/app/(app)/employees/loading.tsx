// src/app/(app)/employees/loading.tsx
// Loading skeleton state for the Employee Directory

export default function EmployeesLoading() {
  return (
    <div className="flex flex-col gap-5 pt-2 pb-32 md:pb-16 max-w-5xl mx-auto animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="h-7 w-48 rounded-lg bg-[var(--surface-raised)]" />
          <div className="h-4 w-72 rounded mt-2 bg-[var(--surface)]" />
        </div>
        <div className="h-10 w-36 rounded-full bg-[var(--surface-raised)]" />
      </div>

      {/* Metric Counters Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-4 rounded-2xl h-24 flex flex-col justify-between"
            style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <div className="h-3 w-20 rounded bg-[var(--surface-raised)]" />
            <div className="h-7 w-12 rounded bg-[var(--surface-raised)]" />
          </div>
        ))}
      </div>

      {/* Search & Tabs Skeleton */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div
          className="flex-1 h-11 rounded-full"
          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
        />
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-9 w-20 rounded-full"
              style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
            />
          ))}
        </div>
      </div>

      {/* Cards Skeleton Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="p-4 rounded-2xl h-44 flex flex-col justify-between"
            style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-[var(--surface-raised)]" />
                <div className="flex flex-col gap-2">
                  <div className="h-4 w-32 rounded bg-[var(--surface-raised)]" />
                  <div className="h-3 w-44 rounded bg-[var(--surface-raised)]" />
                </div>
              </div>
              <div className="h-7 w-16 rounded-full bg-[var(--surface-raised)]" />
            </div>

            <div
              className="flex items-center justify-between pt-3"
              style={{ borderTop: "1px solid var(--border)" }}
            >
              <div className="h-4 w-28 rounded bg-[var(--surface-raised)]" />
              <div className="h-5 w-20 rounded-full bg-[var(--surface-raised)]" />
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="h-3 w-24 rounded bg-[var(--surface-raised)]" />
              <div className="h-3 w-24 rounded bg-[var(--surface-raised)]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
