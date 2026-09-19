// src/engine/components.ts
// Pure salary component evaluation and dependency resolution module for Hajri Payroll Engine
// All monetary arithmetic is strictly integer bigint paise.

import {
  SalaryComponentInput,
  PayrollLine,
  AttendanceSummary,
  Period,
  EmploymentType,
} from './types';

/**
 * Shared Rounding Helper
 * Rounding Rule: Commercial Half-Up Integer Rounding using pure BigInt arithmetic.
 *
 * For non-negative fractions: (numerator + denominator / 2n) / denominator.
 * For negative fractions: (numerator - denominator / 2n) / denominator.
 *
 * Rationale:
 * Indian commercial accounting standards round half a paisa (0.50) upwards to the next paisa.
 * This function guarantees that rounding happens exactly once per component, at the final step,
 * and eliminates any possibility of floating-point inaccuracies (e.g. 0.1 + 0.2 !== 0.3).
 */
export function roundPaise(numerator: bigint, denominator: bigint): bigint {
  if (denominator === 0n) return 0n;
  if (numerator >= 0n) {
    return (numerator + denominator / 2n) / denominator;
  } else {
    return (numerator - denominator / 2n) / denominator;
  }
}

/**
 * Formats a BigInt paise amount into Indian Rupee string without using floating point arithmetic.
 * e.g. 3500000n -> "35,000.00", 41250n -> "412.50"
 */
export function formatPaise(paise: bigint): string {
  const isNegative = paise < 0n;
  const absPaise = isNegative ? -paise : paise;
  const rupees = absPaise / 100n;
  const rem = absPaise % 100n;
  const remStr = rem < 10n ? '0' + rem.toString() : rem.toString();
  return `${isNegative ? '-' : ''}${rupees.toString()}.${remStr}`;
}

/**
 * Sorts salary components in topological order based on their dependency graph (`percentOfCode`).
 * Detects circular dependencies using Depth-First Search (DFS) with 3-state cycle detection.
 * Throws an explicit error if a circular reference is discovered.
 */
export function sortComponentsTopologically(
  components: SalaryComponentInput[]
): SalaryComponentInput[] {
  const componentMap = new Map<string, SalaryComponentInput>();
  for (const comp of components) {
    componentMap.set(comp.code, comp);
  }

  // Adjacency: who does `code` depend ON?
  // If B is 'percent_of' A, B depends on A (A must be evaluated before B).
  const dependencies = new Map<string, string[]>();
  for (const comp of components) {
    if (comp.calcType === 'percent_of' && comp.percentOfCode) {
      if (!componentMap.has(comp.percentOfCode)) {
        throw new Error(
          `Component "${comp.code}" depends on non-existent component "${comp.percentOfCode}".`
        );
      }
      dependencies.set(comp.code, [comp.percentOfCode]);
    } else {
      dependencies.set(comp.code, []);
    }
  }

  // Cycle detection states: 0 = unvisited, 1 = visiting, 2 = visited
  const visited = new Map<string, number>();
  const sorted: SalaryComponentInput[] = [];
  const currentPath: string[] = [];

  function visit(code: string) {
    const state = visited.get(code) ?? 0;
    if (state === 1) {
      // Circular reference detected!
      const cyclePath = [...currentPath, code].join(' -> ');
      throw new Error(`Circular dependency detected in salary components: ${cyclePath}`);
    }
    if (state === 2) {
      return;
    }

    visited.set(code, 1);
    currentPath.push(code);

    const deps = dependencies.get(code) ?? [];
    for (const dep of deps) {
      visit(dep);
    }

    currentPath.pop();
    visited.set(code, 2);

    const comp = componentMap.get(code);
    if (comp) {
      sorted.push(comp);
    }
  }

  for (const comp of components) {
    if ((visited.get(comp.code) ?? 0) === 0) {
      visit(comp.code);
    }
  }

  return sorted;
}

/**
 * Evaluates all salary components in dependency order for an employee.
 * Returns evaluated lines with paise amounts and plain English explainer strings.
 */
export function evaluateComponents(
  components: SalaryComponentInput[],
  employmentType: EmploymentType,
  attendance: AttendanceSummary,
  period: Period
): PayrollLine[] {
  // Sort in dependency order (throws if circular)
  const sortedComponents = sortComponentsTopologically(components);

  const evaluatedLines: PayrollLine[] = [];
  const evaluatedAmounts = new Map<string, bigint>();

  const totalMonthCentiDays = BigInt(period.daysInMonth) * 100n;
  const payableCentiDays = attendance.payableCentiDays;

  for (const comp of sortedComponents) {
    let amountPaise = 0n;
    let explain = '';

    if (comp.calcType === 'fixed') {
      if (period.daysInMonth <= 0) {
        // Zero-day period guard: amount is 0n
        amountPaise = 0n;
        explain = `${comp.label} (${comp.code}): ₹0.00 (Zero-day period).`;
      } else if (employmentType === 'monthly' || employmentType === 'contract') {
        // Prorated by payable days vs total days in month
        // Formula: roundPaise(amountPaise * payableCentiDays, totalMonthCentiDays)
        amountPaise = roundPaise(
          comp.amountPaise * payableCentiDays,
          totalMonthCentiDays
        );
        const payableDaysNum = Number(payableCentiDays) / 100;
        explain =
          `${comp.label} (${comp.code}): Monthly base ₹${formatPaise(comp.amountPaise)} ` +
          `prorated for ${payableDaysNum}/${period.daysInMonth} payable days ` +
          `= ₹${formatPaise(amountPaise)}.`;
      } else if (employmentType === 'daily') {
        // Daily rate multiplied by payable days
        // Formula: roundPaise(dailyRatePaise * payableCentiDays, 100n)
        amountPaise = roundPaise(comp.amountPaise * payableCentiDays, 100n);
        const workedDaysNum = Number(payableCentiDays) / 100;
        explain =
          `${comp.label} (${comp.code}): Daily rate ₹${formatPaise(comp.amountPaise)} ` +
          `× ${workedDaysNum} days worked = ₹${formatPaise(amountPaise)}.`;
      } else if (employmentType === 'hourly') {
        // Hourly rate multiplied by worked hours
        // comp.amountPaise is hourly rate in paise
        // Formula: roundPaise(hourlyRatePaise * workedMinutes, 60n)
        amountPaise = roundPaise(comp.amountPaise * attendance.workedMinutes, 60n);
        explain =
          `${comp.label} (${comp.code}): Hourly rate ₹${formatPaise(comp.amountPaise)} ` +
          `for ${attendance.workedMinutes} minutes worked = ₹${formatPaise(amountPaise)}.`;
      }
    } else if (comp.calcType === 'percent_of') {
      const baseCode = comp.percentOfCode ?? '';
      const baseAmount = evaluatedAmounts.get(baseCode) ?? 0n;
      const baseComp = sortedComponents.find((c) => c.code === baseCode);
      const baseLabel = baseComp?.label ?? baseCode;

      // comp.amountPaise stores percentage in basis points (1% = 100 basis points, e.g. 1200n = 12%)
      // If comp.amountPaise is given directly as percentage * 100:
      // Formula: roundPaise(baseAmount * percentBasisPoints, 10000n)
      amountPaise = roundPaise(baseAmount * comp.amountPaise, 10000n);

      const percentNumber = Number(comp.amountPaise) / 100;
      explain =
        `${comp.label} (${comp.code}): ${percentNumber}% of ${baseLabel} ` +
        `(₹${formatPaise(baseAmount)}) = ₹${formatPaise(amountPaise)}.`;
    }

    evaluatedAmounts.set(comp.code, amountPaise);

    evaluatedLines.push({
      componentCode: comp.code,
      label: comp.label,
      kind: comp.kind,
      amountPaise,
      explain,
    });
  }

  // Handle Overtime for Daily / Hourly workers if OT minutes exist and an OT rate is provided
  if (attendance.otMinutes > 0n) {
    const otComponent = components.find(
      (c) => c.code === 'OT' || c.code === 'OVERTIME' || c.code === 'OT_RATE'
    );
    if (otComponent && !evaluatedAmounts.has('OT_EARNING')) {
      // OT hourly rate: if hourly employee, use otComponent amountPaise; if daily, use rate per hour
      const otHourlyRate = otComponent.amountPaise;
      const otPaise = roundPaise(otHourlyRate * attendance.otMinutes, 60n);
      const otHours = Number(attendance.otMinutes) / 60;
      evaluatedLines.push({
        componentCode: 'OT_EARNING',
        label: 'Overtime Pay',
        kind: 'earning',
        amountPaise: otPaise,
        explain: `Overtime Pay: ₹${formatPaise(otHourlyRate)}/hr × ${otHours} OT hours (${attendance.otMinutes} mins) = ₹${formatPaise(otPaise)}.`,
      });
    }
  }

  return evaluatedLines;
}
