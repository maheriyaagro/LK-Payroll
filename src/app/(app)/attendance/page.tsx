"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  CheckCheck,
  Check,
  ChevronDown,
  Clock,
  User,
  ExternalLink,
  Plus,
  Minus,
} from "lucide-react";
import {
  attendanceWorkers,
  mockWeekDays,
  type AttendanceOption,
} from "@/lib/mock";

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

  // 3. Expanded card state: ID of currently expanded worker card
  const [expandedWorkerId, setExpandedWorkerId] = useState<string | null>(null);

  // 4. Overtime hours map per worker (defaults to mock otHours or 2)
  const [otHoursMap, setOtHoursMap] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (const w of attendanceWorkers) {
      initial[w.id] = w.otHours || 2;
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

  // Adjust OT hours and set status to OT
  const handleOtHoursChange = (id: string, delta: number) => {
    setOtHoursMap((prev) => {
      const current = prev[id] || 2;
      const nextVal = Math.max(1, Math.min(12, current + delta));
      return { ...prev, [id]: nextVal };
    });
    setAttendance((prev) => ({
      ...prev,
      [id]: "OT",
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
          else if (st === "OT") ot += otHoursMap[w.id] || w.otHours || 2;
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
    }, [attendance, otHoursMap]);

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
          <span style={{ fontSize: 16, fontWeight: 700, color: "#3B82F6" }}>
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
          const isExpanded = expandedWorkerId === worker.id;
          const currentOt = otHoursMap[worker.id] || worker.otHours || 2;

          return (
            <div
              key={worker.id}
              onClick={() => setExpandedWorkerId(isExpanded ? null : worker.id)}
              className="flex flex-col transition-all cursor-pointer select-none group"
              style={{
                backgroundColor: "var(--surface)",
                borderRadius: "var(--radius-card)",
                border: isExpanded
                  ? currentStatus === "OT"
                    ? "1px solid rgba(59, 130, 246, 0.45)"
                    : "1px solid rgba(254, 87, 51, 0.45)"
                  : "1px solid var(--border)",
                boxShadow: isExpanded ? "0 4px 20px rgba(0, 0, 0, 0.45)" : "none",
                overflow: "hidden",
              }}
            >
              {/* ── Main Compact Header Row ── */}
              <div className="flex items-center justify-between gap-3 p-3 sm:p-3.5">
                {/* Left: Avatar + Name + Role + Status Indicator */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="flex items-center justify-center shrink-0 transition-colors"
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: "var(--radius-pill)",
                      backgroundColor: "var(--surface-high)",
                      color:
                        currentStatus === "P"
                          ? "var(--positive)"
                          : currentStatus === "A"
                          ? "var(--negative)"
                          : currentStatus === "H"
                          ? "#F59E0B"
                          : currentStatus === "OT"
                          ? "#3B82F6"
                          : "var(--text-muted)",
                      fontSize: 13,
                      fontWeight: 600,
                      border:
                        currentStatus === "P"
                          ? "1.5px solid rgba(16, 185, 129, 0.4)"
                          : currentStatus === "A"
                          ? "1.5px solid rgba(239, 68, 68, 0.4)"
                          : currentStatus === "H"
                          ? "1.5px solid rgba(245, 158, 11, 0.4)"
                          : currentStatus === "OT"
                          ? "1.5px solid rgba(59, 130, 246, 0.4)"
                          : "1px solid var(--border)",
                    }}
                  >
                    {worker.initials}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p
                        className="truncate leading-tight font-semibold"
                        style={{ fontSize: 14, color: "var(--text)" }}
                      >
                        {worker.name}
                      </p>
                      {/* If marked H or OT, show prominent badge */}
                      {currentStatus === "H" && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 shrink-0">
                          Half-day
                        </span>
                      )}
                      {currentStatus === "OT" && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30 shrink-0">
                          OT {currentOt}h
                        </span>
                      )}
                    </div>
                    <p
                      className="text-caption truncate mt-0.5"
                      style={{ color: "var(--text-muted)", fontSize: 12 }}
                    >
                      {worker.role}
                    </p>
                  </div>
                </div>

                {/* Right: Quick P & A Buttons + Chevron */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Segmented Quick P / A Control */}
                  <div
                    className="flex items-center p-1 rounded-full shrink-0"
                    style={{
                      backgroundColor: "var(--surface-raised)",
                      border: "1px solid var(--border)",
                      gap: 3,
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Quick Present Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectStatus(worker.id, "P");
                      }}
                      className="flex items-center justify-center font-bold transition-all cursor-pointer active:scale-95"
                      style={{
                        width: 36,
                        height: 32,
                        borderRadius: "var(--radius-pill)",
                        backgroundColor: currentStatus === "P" ? "var(--positive)" : "transparent",
                        color: currentStatus === "P" ? "#ffffff" : "var(--text-muted)",
                        fontSize: 13,
                        boxShadow: currentStatus === "P" ? "0 2px 8px rgba(16, 185, 129, 0.4)" : "none",
                      }}
                      aria-label={`Mark ${worker.name} as Present`}
                    >
                      P
                    </button>

                    {/* Quick Absent Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectStatus(worker.id, "A");
                      }}
                      className="flex items-center justify-center font-bold transition-all cursor-pointer active:scale-95"
                      style={{
                        width: 36,
                        height: 32,
                        borderRadius: "var(--radius-pill)",
                        backgroundColor: currentStatus === "A" ? "var(--negative)" : "transparent",
                        color: currentStatus === "A" ? "#ffffff" : "var(--text-muted)",
                        fontSize: 13,
                        boxShadow: currentStatus === "A" ? "0 2px 8px rgba(239, 68, 68, 0.4)" : "none",
                      }}
                      aria-label={`Mark ${worker.name} as Absent`}
                    >
                      A
                    </button>
                  </div>

                  {/* Expand indicator icon */}
                  <div
                    className="flex items-center justify-center w-7 h-7 rounded-full transition-transform"
                    style={{
                      color: "var(--text-muted)",
                      transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.2s ease",
                    }}
                  >
                    <ChevronDown size={16} />
                  </div>
                </div>
              </div>

              {/* ── Expanded Details Drawer (H, OT & Full Profile Link) ── */}
              {isExpanded && (
                <div
                  className="px-3.5 pb-3.5 pt-3 flex flex-col gap-3 border-t transition-all"
                  style={{
                    borderColor: "var(--border)",
                    backgroundColor: "var(--surface-raised)",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Row: Status Controls (H & OT) + OT Hours Stepper */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-0.5">
                    {/* Segmented H & OT Pill Control - matches P/A capsule design */}
                    <div
                      className="flex items-center p-1 rounded-full shrink-0 self-start sm:self-auto shadow-sm"
                      style={{
                        backgroundColor: "var(--surface)",
                        border: "1px solid var(--border)",
                        gap: 4,
                      }}
                    >
                      {/* Half-Day (H) Button */}
                      <button
                        type="button"
                        onClick={() => handleSelectStatus(worker.id, currentStatus === "H" ? "P" : "H")}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 font-bold transition-all cursor-pointer active:scale-95"
                        style={{
                          height: 32,
                          borderRadius: "var(--radius-pill)",
                          backgroundColor: currentStatus === "H" ? "#F59E0B" : "transparent",
                          color: currentStatus === "H" ? "#ffffff" : "var(--text-muted)",
                          fontSize: 12,
                          boxShadow:
                            currentStatus === "H" ? "0 2px 10px rgba(245, 158, 11, 0.45)" : "none",
                        }}
                        aria-label={`Mark ${worker.name} as Half-day`}
                      >
                        <span
                          className="flex items-center justify-center font-black rounded-full"
                          style={{
                            width: 18,
                            height: 18,
                            fontSize: 10,
                            backgroundColor:
                              currentStatus === "H"
                                ? "rgba(255, 255, 255, 0.25)"
                                : "rgba(245, 158, 11, 0.15)",
                            color: currentStatus === "H" ? "#ffffff" : "#F59E0B",
                          }}
                        >
                          H
                        </span>
                        <span>Half-day</span>
                      </button>

                      {/* Overtime (OT) Button */}
                      <button
                        type="button"
                        onClick={() => handleSelectStatus(worker.id, currentStatus === "OT" ? "P" : "OT")}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 font-bold transition-all cursor-pointer active:scale-95"
                        style={{
                          height: 32,
                          borderRadius: "var(--radius-pill)",
                          backgroundColor: currentStatus === "OT" ? "#2563EB" : "transparent",
                          color: currentStatus === "OT" ? "#ffffff" : "var(--text-muted)",
                          fontSize: 12,
                          boxShadow:
                            currentStatus === "OT" ? "0 2px 10px rgba(37, 99, 235, 0.5)" : "none",
                        }}
                        aria-label={`Mark ${worker.name} as Overtime`}
                      >
                        <Clock
                          size={13}
                          className={currentStatus === "OT" ? "text-white" : "text-blue-500"}
                        />
                        <span>Overtime</span>
                      </button>
                    </div>

                    {/* OT Hours Stepper Pill */}
                    <div
                      className="flex items-center justify-between gap-3 px-3 py-1 rounded-full text-xs transition-all shadow-sm"
                      style={{
                        backgroundColor: "var(--surface)",
                        border:
                          currentStatus === "OT"
                            ? "1px solid rgba(59, 130, 246, 0.4)"
                            : "1px solid var(--border)",
                        boxShadow:
                          currentStatus === "OT" ? "0 0 12px rgba(59, 130, 246, 0.15)" : "none",
                        height: 40,
                      }}
                    >
                      <div className="flex items-center gap-1.5 pl-0.5">
                        <span
                          className="w-2 h-2 rounded-full transition-all"
                          style={{
                            backgroundColor:
                              currentStatus === "OT" ? "#3B82F6" : "rgba(0, 0, 0, 0.15)",
                            boxShadow: currentStatus === "OT" ? "0 0 6px #3B82F6" : "none",
                          }}
                        />
                        <span
                          style={{
                            color: currentStatus === "OT" ? "#1D4ED8" : "var(--text-muted)",
                            fontSize: 11,
                            fontWeight: 600,
                          }}
                        >
                          OT Hours
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOtHoursChange(worker.id, -1)}
                          className="w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer hover:bg-black/5 active:scale-90"
                          style={{
                            backgroundColor: "var(--surface-raised)",
                            color: "var(--text)",
                          }}
                          title="Decrease OT hours"
                        >
                          <Minus size={11} />
                        </button>
                        <span
                          className="font-mono font-bold px-1 text-center"
                          style={{
                            minWidth: 28,
                            fontSize: 13,
                            color: currentStatus === "OT" ? "#2563EB" : "var(--text)",
                          }}
                        >
                          {currentOt}h
                        </span>
                        <button
                          type="button"
                          onClick={() => handleOtHoursChange(worker.id, 1)}
                          className="w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer hover:bg-black/5 active:scale-90"
                          style={{
                            backgroundColor: "var(--surface-raised)",
                            color: "var(--text)",
                          }}
                          title="Increase OT hours"
                        >
                          <Plus size={11} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Link to Open Whole Profile & Employee ID */}
                  <div className="pt-2.5 flex items-center justify-between gap-3 border-t border-[var(--border)]">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                        ID
                      </span>
                      <span className="font-mono text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] shadow-xs">
                        EMP-010{worker.id}
                      </span>
                    </div>

                    <Link
                      href={`/employees/${worker.id}`}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-full transition-all hover:bg-[#FE5733]/15 active:scale-95 cursor-pointer group/link shadow-xs"
                      style={{
                        backgroundColor: "var(--surface)",
                        color: "var(--accent)",
                        border: "1px solid rgba(254, 87, 51, 0.35)",
                      }}
                    >
                      <User size={12} />
                      <span>Open Full Profile</span>
                      <ExternalLink
                        size={11}
                        className="opacity-70 group-hover/link:opacity-100 transition-opacity"
                      />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── 5. Floating Save & Status Pill Dock ── */}
      <div
        className="fixed z-40 pointer-events-none transition-all duration-300 left-0 right-0 md:left-[240px] flex justify-center"
        style={{
          bottom: "calc(88px + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <div
          className="pointer-events-auto flex items-center justify-between gap-3 min-[400px]:gap-5 py-2 pl-4.5 pr-2 transition-all duration-300 shadow-2xl"
          style={{
            background: "linear-gradient(180deg, rgba(32, 34, 40, 0.96) 0%, rgba(18, 20, 25, 0.98) 100%)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            borderRadius: "var(--radius-pill)",
            border: "1px solid rgba(255, 255, 255, 0.16)",
            boxShadow: "0 14px 36px rgba(0, 0, 0, 0.55), 0 4px 14px rgba(0, 0, 0, 0.35)",
            height: 52,
          }}
        >
          {/* Status count */}
          <div className="flex items-center gap-2.5 pl-1">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
              style={{
                backgroundColor: pendingCount === 0 ? "#10B981" : "var(--accent)",
                boxShadow: pendingCount === 0 ? "0 0 8px #10B981" : "0 0 8px var(--accent)",
              }}
            />
            <p className="text-xs min-[400px]:text-sm font-bold tracking-wide whitespace-nowrap flex items-center">
              <span className="text-white">{markedCount} marked</span>
              <span className="text-white/40 mx-2">•</span>
              <span style={{ color: pendingCount > 0 ? "#FB923C" : "rgba(255, 255, 255, 0.6)" }}>
                {pendingCount} pending
              </span>
            </p>
          </div>

          {/* Save action */}
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 font-bold transition-all active:scale-95 cursor-pointer shrink-0"
            style={{
              height: 38,
              padding: "0 22px",
              borderRadius: "var(--radius-pill)",
              backgroundColor: "var(--accent)",
              color: "#ffffff",
              fontSize: 14,
              boxShadow: "0 3px 12px rgba(254, 87, 51, 0.45)",
            }}
          >
            {savedFeedback ? (
              <>
                <Check size={16} strokeWidth={2.5} />
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
