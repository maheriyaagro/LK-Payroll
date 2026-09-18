"use client";

import { useState, useMemo } from "react";
import { CheckCheck, Check } from "lucide-react";
import {
  attendanceWorkers,
  mockWeekDays,
  type AttendanceOption,
} from "@/lib/mock";

const OPTIONS: AttendanceOption[] = ["P", "H", "A", "OT"];

export default function AttendancePage() {
  // 1. Date strip state (today selected by default)
  const [selectedDayKey, setSelectedDayKey] = useState<string>("d7");

  // 2. Attendance state map: workerId -> AttendanceOption | null
  const [attendance, setAttendance] = useState<Record<string, AttendanceOption | null>>(() => {
    const initial: Record<string, AttendanceOption | null> = {};
    for (const w of attendanceWorkers) {
      initial[w.id] = w.initialStatus;
    }
    return initial;
  });

  const [savedFeedback, setSavedFeedback] = useState(false);

  // Toggle or select status
  const handleSelectStatus = (id: string, opt: AttendanceOption) => {
    setAttendance((prev: Record<string, AttendanceOption | null>) => ({
      ...prev,
      [id]: opt,
    }));
  };

  // Bulk action: Mark all present
  const handleMarkAllPresent = () => {
    setAttendance((prev: Record<string, AttendanceOption | null>) => {
      const next = { ...prev };
      for (const w of attendanceWorkers) {
        next[w.id] = "P";
      }
      return next;
    });
  };

  // Save handler
  const handleSave = () => {
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2000);
  };

  // Computed summary counts (updates live on state change)
  const { presentCount, absentCount, halfDayCount, otHours, markedCount, pendingCount } =
    useMemo(() => {
      let p = 0;
      let a = 0;
      let h = 0;
      let ot = 0;
      let marked = 0;

      for (const w of attendanceWorkers) {
        const st = attendance[w.id];
        if (st) {
          marked++;
          if (st === "P") p++;
          else if (st === "A") a++;
          else if (st === "H") h++;
          else if (st === "OT") ot += w.otHours || 3;
        }
      }

      return {
        presentCount: p,
        absentCount: a,
        halfDayCount: h,
        otHours: ot,
        markedCount: marked,
        pendingCount: attendanceWorkers.length - marked,
      };
    }, [attendance]);

  return (
    <div className="flex flex-col gap-4 pt-2 pb-36 md:pb-24">
      {/* ── 1. Date Strip ── */}
      <div
        className="flex gap-2 overflow-x-auto pb-1"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {mockWeekDays.map((day) => {
          const isSelected = day.key === selectedDayKey;
          return (
            <button
              key={day.key}
              onClick={() => setSelectedDayKey(day.key)}
              className="flex flex-col items-center justify-center shrink-0 transition-all cursor-pointer"
              style={{
                width: 52,
                height: 64,
                borderRadius: "var(--radius-card)",
                backgroundColor: isSelected ? "var(--accent)" : "var(--surface)",
                color: isSelected ? "#ffffff" : "var(--text)",
                boxShadow: isSelected ? "0 4px 14px rgba(254, 87, 51, 0.3)" : "none",
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: isSelected ? "rgba(255, 255, 255, 0.85)" : "var(--text-muted)",
                }}
              >
                {day.dayName}
              </span>
              <span style={{ fontSize: 17, fontWeight: 600, marginTop: 2 }}>
                {day.dateNum}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── 2. Summary Stat Pills ── */}
      <div className="grid grid-cols-4 gap-2">
        <div
          className="flex flex-col items-center justify-center py-2 px-1 text-center"
          style={{
            backgroundColor: "var(--surface)",
            borderRadius: "var(--radius-card)",
            border: "1px solid var(--border)",
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 700, color: "var(--positive)" }}>
            {presentCount}
          </span>
          <span className="text-caption mt-0.5 truncate w-full" style={{ color: "var(--text-muted)", fontSize: 11 }}>
            Present
          </span>
        </div>

        <div
          className="flex flex-col items-center justify-center py-2 px-1 text-center"
          style={{
            backgroundColor: "var(--surface)",
            borderRadius: "var(--radius-card)",
            border: "1px solid var(--border)",
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 700, color: "var(--negative)" }}>
            {absentCount}
          </span>
          <span className="text-caption mt-0.5 truncate w-full" style={{ color: "var(--text-muted)", fontSize: 11 }}>
            Absent
          </span>
        </div>

        <div
          className="flex flex-col items-center justify-center py-2 px-1 text-center"
          style={{
            backgroundColor: "var(--surface)",
            borderRadius: "var(--radius-card)",
            border: "1px solid var(--border)",
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 700, color: "var(--accent-2)" }}>
            {halfDayCount}
          </span>
          <span className="text-caption mt-0.5 truncate w-full" style={{ color: "var(--text-muted)", fontSize: 11 }}>
            Half-day
          </span>
        </div>

        <div
          className="flex flex-col items-center justify-center py-2 px-1 text-center"
          style={{
            backgroundColor: "var(--surface)",
            borderRadius: "var(--radius-card)",
            border: "1px solid var(--border)",
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>
            {otHours}h
          </span>
          <span className="text-caption mt-0.5 truncate w-full" style={{ color: "var(--text-muted)", fontSize: 11 }}>
            Overtime
          </span>
        </div>
      </div>

      {/* ── 3. Bulk Action Bar ── */}
      <button
        onClick={handleMarkAllPresent}
        className="w-full flex items-center justify-center gap-2 font-medium transition-all active:scale-[0.99] cursor-pointer"
        style={{
          height: 46,
          borderRadius: "var(--radius-pill)",
          backgroundColor: "var(--surface-high)",
          color: "var(--text)",
          fontSize: 14,
        }}
      >
        <CheckCheck size={18} style={{ color: "var(--accent)" }} />
        <span>Mark all present</span>
      </button>

      {/* ── 4. Employee Cards (Responsive 2-column grid at lg:) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
        {attendanceWorkers.map((worker) => {
          const currentStatus = attendance[worker.id];

          return (
            <div
              key={worker.id}
              className="flex items-center justify-between gap-3 transition-all"
              style={{
                backgroundColor: "var(--surface)",
                borderRadius: "var(--radius-card)",
                padding: "12px 14px",
                border: "1px solid var(--border)",
              }}
            >
              {/* Left: Avatar + Name + Role */}
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="flex items-center justify-center shrink-0"
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: "var(--radius-pill)",
                    backgroundColor: "var(--surface-high)",
                    color: "var(--text-muted)",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {worker.initials}
                </div>
                <div className="min-w-0">
                  <p
                    className="truncate leading-tight"
                    style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}
                  >
                    {worker.name}
                  </p>
                  <p
                    className="text-caption truncate mt-0.5"
                    style={{ color: "var(--text-muted)", fontSize: 12 }}
                  >
                    {worker.role}
                  </p>
                </div>
              </div>

              {/* Right: Segmented control (P, H, A, OT) */}
              <div
                className="flex items-center shrink-0 p-1"
                style={{
                  backgroundColor: "var(--surface-high)",
                  borderRadius: "var(--radius-pill)",
                  gap: 2,
                }}
              >
                {OPTIONS.map((opt) => {
                  const isSelected = currentStatus === opt;
                  return (
                    <button
                      key={opt}
                      onClick={() => handleSelectStatus(worker.id, opt)}
                      className="flex items-center justify-center font-semibold transition-all cursor-pointer"
                      style={{
                        width: 32,
                        height: 30,
                        borderRadius: "var(--radius-pill)",
                        backgroundColor: isSelected ? "var(--accent)" : "transparent",
                        color: isSelected ? "#ffffff" : "var(--text-muted)",
                        fontSize: 12,
                        boxShadow: isSelected ? "0 2px 6px rgba(254, 87, 51, 0.35)" : "none",
                      }}
                      aria-label={`Mark ${worker.name} as ${opt}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── 5. Floating Save & Status Pill Dock ── */}
      <div
        className="fixed z-40 pointer-events-none transition-all duration-300 left-0 right-0 md:left-[240px] flex justify-center"
        style={{
          bottom: "calc(74px + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <div
          className="pointer-events-auto flex items-center justify-between gap-3 min-[400px]:gap-5 py-1.5 pl-4 pr-1.5 transition-all duration-300 shadow-2xl"
          style={{
            backgroundColor: "rgba(22, 22, 24, 0.94)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            borderRadius: "var(--radius-pill)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            boxShadow: "0 10px 32px rgba(0, 0, 0, 0.6), 0 2px 8px rgba(0, 0, 0, 0.4)",
          }}
        >
          {/* Status count */}
          <div className="flex items-center gap-2">
            <span
              className="inline-block w-2 h-2 rounded-full shrink-0"
              style={{
                backgroundColor: pendingCount === 0 ? "var(--positive)" : "var(--accent)",
              }}
            />
            <p className="text-xs min-[400px]:text-sm font-semibold tracking-wide whitespace-nowrap" style={{ color: "var(--text)" }}>
              <span>{markedCount} marked</span>
              <span style={{ color: "rgba(255,255,255,0.3)", margin: "0 5px" }}>•</span>
              <span style={{ color: pendingCount > 0 ? "var(--accent-2)" : "var(--text-muted)" }}>
                {pendingCount} pending
              </span>
            </p>
          </div>

          {/* Save action */}
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 font-semibold transition-all active:scale-95 cursor-pointer shrink-0"
            style={{
              height: 36,
              padding: "0 18px",
              borderRadius: "var(--radius-pill)",
              backgroundColor: "var(--accent)",
              color: "#ffffff",
              fontSize: 13,
              boxShadow: "0 2px 10px rgba(254, 87, 51, 0.4)",
            }}
          >
            {savedFeedback ? (
              <>
                <Check size={15} />
                <span>Saved</span>
              </>
            ) : (
              <span>Save</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
