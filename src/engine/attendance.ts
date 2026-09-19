// src/engine/attendance.ts
// Pure attendance aggregation module for Hajri Payroll Engine
// All day arithmetic uses integer centi-days (1 full day = 100n centi-days, half day = 50n centi-days)
// to ensure zero floating-point arithmetic.

import {
  EmployeeInput,
  Period,
  AttendanceRow,
  AttendanceSummary,
} from './types';

/**
 * Pure date comparison helper (ISO format: 'YYYY-MM-DD').
 * Compares two ISO date strings deterministically without timezone side-effects.
 */
function compareIsoDates(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * Computes calendar day difference (inclusive) between two ISO 'YYYY-MM-DD' dates.
 * Pure integer arithmetic based on UTC timestamps.
 */
function calendarDaysBetween(startIso: string, endIso: string): number {
  if (compareIsoDates(startIso, endIso) > 0) return 0;
  const s = new Date(startIso + 'T00:00:00.000Z');
  const e = new Date(endIso + 'T00:00:00.000Z');
  const msDiff = e.getTime() - s.getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  return Math.floor(msDiff / dayMs) + 1;
}

/**
 * Summarizes an employee's attendance for a given period.
 * Pure function: same input always produces same output. No I/O, no Date.now().
 */
export function summarizeAttendance(
  employee: EmployeeInput,
  attendanceRows: AttendanceRow[],
  period: Period
): AttendanceSummary {
  // Edge Case: Zero-day period guard
  if (period.daysInMonth <= 0) {
    return {
      totalDaysInPeriod: 0,
      payableCentiDays: 0n,
      lopCentiDays: 0n,
      workedMinutes: 0n,
      otMinutes: 0n,
      weeklyOffCount: 0,
      holidayCount: 0,
      presentCount: 0,
      halfDayCount: 0,
      absentCount: 0,
      explain: 'Zero-day period: 0 payable days and 0 worked minutes.',
    };
  }

  // 1. Determine active employment window within the period
  // Effective start = max(period.startDate, employee.doj)
  const effectiveStart =
    compareIsoDates(period.startDate, employee.doj) > 0
      ? period.startDate
      : employee.doj;

  // Effective end = min(period.endDate, employee.dol ?? period.endDate)
  const effectiveEnd =
    employee.dol && compareIsoDates(period.endDate, employee.dol) > 0
      ? employee.dol
      : period.endDate;

  // If employee was not yet hired or already left before this period:
  const isActiveInPeriod = compareIsoDates(effectiveStart, effectiveEnd) <= 0;
  const activeCalendarDays = isActiveInPeriod
    ? calendarDaysBetween(effectiveStart, effectiveEnd)
    : 0;

  // 2. Filter attendance records to those falling strictly within active employment dates and within the period
  const relevantRows = attendanceRows.filter((row) => {
    return (
      compareIsoDates(row.workDate, period.startDate) >= 0 &&
      compareIsoDates(row.workDate, period.endDate) <= 0 &&
      compareIsoDates(row.workDate, effectiveStart) >= 0 &&
      compareIsoDates(row.workDate, effectiveEnd) <= 0
    );
  });

  let presentCount = 0;
  let halfDayCount = 0;
  let absentCount = 0;
  let weeklyOffCount = 0;
  let holidayCount = 0;
  let lopLeaveCount = 0;
  let paidLeaveCount = 0;
  let totalWorkedMins = 0n;
  let totalOtMins = 0n;

  for (const row of relevantRows) {
    if (row.workedMinutes && row.workedMinutes > 0) {
      totalWorkedMins += BigInt(row.workedMinutes);
    }
    if (row.otMinutes && row.otMinutes > 0) {
      totalOtMins += BigInt(row.otMinutes);
    }

    switch (row.status) {
      case 'P':
        presentCount++;
        break;
      case 'H':
        halfDayCount++;
        break;
      case 'A':
        absentCount++;
        break;
      case 'W':
        weeklyOffCount++;
        break;
      case 'OT':
        presentCount++; // OT shifts count as full day present + OT minutes
        break;
      case 'L':
        if (row.isLop) {
          lopLeaveCount++;
        } else {
          paidLeaveCount++;
        }
        break;
    }
  }

  // 3. Compute payable and LOP centi-days depending on employment type
  // (1 full day = 100n centi-days, 0.5 day = 50n centi-days)
  let payableCentiDays = 0n;
  let lopCentiDays = 0n;
  let explain = '';

  if (employee.employmentType === 'monthly') {
    // Monthly: Paid on calendar active days minus unworked/unpaid days
    // Mid-month joining/leaving reduces baseline active calendar days.
    const activeCentiDays = BigInt(activeCalendarDays) * 100n;
    const totalMonthCentiDays = BigInt(period.daysInMonth) * 100n;

    // Proration deduction for days before joining or after leaving
    const inactiveCentiDays = totalMonthCentiDays - activeCentiDays;

    const explicitLopCentiDays =
      BigInt(absentCount + lopLeaveCount) * 100n + BigInt(halfDayCount) * 50n;

    lopCentiDays = inactiveCentiDays + explicitLopCentiDays;
    payableCentiDays = activeCentiDays - explicitLopCentiDays;
    if (payableCentiDays < 0n) payableCentiDays = 0n;

    explain =
      `Monthly: ${activeCalendarDays} active calendar days out of ${period.daysInMonth} days in month. ` +
      `Present: ${presentCount}, Weekly Offs: ${weeklyOffCount}, Half-days: ${halfDayCount}, ` +
      `Absent/LOP: ${absentCount + lopLeaveCount}. ` +
      `Payable days: ${Number(payableCentiDays) / 100} days (${payableCentiDays} centi-days), ` +
      `LOP days: ${Number(lopCentiDays) / 100} days.`;
  } else if (employee.employmentType === 'daily') {
    // Daily Wage: Paid strictly for days worked
    // Present: 100 centi-days, Half-day: 50 centi-days
    payableCentiDays = BigInt(presentCount) * 100n + BigInt(halfDayCount) * 50n;
    lopCentiDays = 0n;

    explain =
      `Daily: ${presentCount} full shifts worked, ${halfDayCount} half-day shifts. ` +
      `Total payable days: ${Number(payableCentiDays) / 100} days (${payableCentiDays} centi-days), ` +
      `OT minutes: ${totalOtMins}.`;
  } else if (employee.employmentType === 'hourly') {
    // Hourly: Paid on worked hours and minutes
    payableCentiDays = BigInt(presentCount) * 100n + BigInt(halfDayCount) * 50n;
    lopCentiDays = 0n;

    explain =
      `Hourly: Total worked minutes = ${totalWorkedMins} mins, ` +
      `OT minutes = ${totalOtMins} mins.`;
  } else {
    // Contract: Fixed retainer subject to active service duration
    const activeCentiDays = BigInt(activeCalendarDays) * 100n;
    const totalMonthCentiDays = BigInt(period.daysInMonth) * 100n;
    const inactiveCentiDays = totalMonthCentiDays - activeCentiDays;
    const explicitLopCentiDays = BigInt(absentCount + lopLeaveCount) * 100n;

    lopCentiDays = inactiveCentiDays + explicitLopCentiDays;
    payableCentiDays = activeCentiDays - explicitLopCentiDays;
    if (payableCentiDays < 0n) payableCentiDays = 0n;

    explain =
      `Contract: ${activeCalendarDays}/${period.daysInMonth} active days. ` +
      `Payable days: ${Number(payableCentiDays) / 100} days.`;
  }

  return {
    totalDaysInPeriod: period.daysInMonth,
    payableCentiDays,
    lopCentiDays,
    workedMinutes: totalWorkedMins,
    otMinutes: totalOtMins,
    weeklyOffCount,
    holidayCount,
    presentCount,
    halfDayCount,
    absentCount,
    explain,
  };
}
