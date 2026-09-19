// src/engine/calculate.ts
// Master entry point for the Hajri Payroll Calculation Engine
// Strictly pure TypeScript. Zero external runtime dependencies. Zero floating-point arithmetic.

import {
  PayrollInput,
  PayrollResult,
  PayrollLine,
  AdvanceRecoveryResult,
} from './types';
import { summarizeAttendance } from './attendance';
import { evaluateComponents, formatPaise } from './components';
import { loadRulePack } from './rules/loader';
import { pf, esi, pt, tds } from './statutory';
import { wageCodeCheck } from './validators';

/**
 * calculatePayroll(input):
 * Evaluates payroll for a single employee in a given period.
 *
 * Guarantees:
 * 1. Pure function: deterministic output given the input. No side effects.
 * 2. Integer paise arithmetic: all monetary fields are BigInt paise.
 * 3. Advance Clamping: Advance recovery is clamped so net pay never drops below 0 paise.
 * 4. Zero-day month guard: Zero-day periods return 0 paise cleanly without throwing or NaN.
 * 5. Full auditability: Every component and deduction returns a plain-English explanation.
 * 6. Statutory Compliance: Evaluates PF, ESI, PT, and Wage Code 50% threshold without mutating rates.
 */
export function calculatePayroll(input: PayrollInput): PayrollResult {
  const { employee, components, attendance, advances = [], period, applyStatutory } = input;

  // 1. Guard: Zero-day month or inactive employee
  if (period.daysInMonth <= 0) {
    const emptyAttendance = summarizeAttendance(employee, attendance, period);
    return {
      employeeId: employee.id,
      period,
      attendanceSummary: emptyAttendance,
      lines: [],
      grossPaise: 0n,
      deductionsPaise: 0n,
      advanceRecoveries: [],
      totalAdvanceRecoveredPaise: 0n,
      netPaise: 0n,
      explain: 'Zero-day period: 0 payable days, gross = ₹0.00, deductions = ₹0.00, net pay = ₹0.00.',
      warnings: [],
    };
  }

  // 2. Compliance: Indian Code on Wages (50% rule) check (returns warning only, never mutates)
  const wageCheck = wageCodeCheck(input);
  const warnings: string[] = [];
  if (wageCheck.warning) {
    warnings.push(wageCheck.warning);
  }

  // 3. Summarize attendance for the period
  const attendanceSummary = summarizeAttendance(employee, attendance, period);

  // 4. Evaluate non-statutory salary components in topological order
  const nonStatutoryComponents = components.filter(
    (c) => !c.isStatutory && !['PF', 'PF_EE', 'ESI', 'ESI_EE', 'PT', 'TDS'].includes(c.code.toUpperCase())
  );

  const lines: PayrollLine[] = evaluateComponents(
    nonStatutoryComponents,
    employee.employmentType,
    attendanceSummary,
    period
  );

  // Calculate gross earnings so far
  let grossPaise = 0n;
  for (const line of lines) {
    if (line.kind === 'earning') {
      grossPaise += line.amountPaise;
    }
  }

  // 5. Statutory Components Registration & Evaluation
  const shouldApplyStatutory =
    applyStatutory === true ||
    components.some(
      (c) => c.isStatutory || ['PF', 'PF_EE', 'ESI', 'ESI_EE', 'PT', 'TDS'].includes(c.code.toUpperCase())
    );

  if (shouldApplyStatutory) {
    // A. Provident Fund (PF)
    const pfRule = loadRulePack('pf', period);
    const pfLines = pf(input, pfRule, lines);
    lines.push(...pfLines);

    // B. Employee State Insurance (ESI)
    const esiRule = loadRulePack('esi', period);
    const esiLines = esi(input, esiRule, grossPaise);
    lines.push(...esiLines);

    // C. Professional Tax (PT)
    const state = employee.stateCode || 'MH';
    const ptRule = loadRulePack('pt', period, state);
    const ptLines = pt(input, ptRule, grossPaise);
    lines.push(...ptLines);

    // D. Tax Deducted at Source (TDS Stub)
    const tdsLine = tds(input);
    lines.push(tdsLine);
  } else {
    // If explicit non-statutory component list has custom deductions that were excluded above
    const statutoryOrExcluded = components.filter((c) =>
      c.isStatutory || ['PF', 'PF_EE', 'ESI', 'ESI_EE', 'PT', 'TDS'].includes(c.code.toUpperCase())
    );
    if (statutoryOrExcluded.length > 0) {
      const customLines = evaluateComponents(
        statutoryOrExcluded,
        employee.employmentType,
        attendanceSummary,
        period
      );
      lines.push(...customLines);
    }
  }

  // 6. Aggregate Gross Earnings and Deductions
  grossPaise = 0n;
  let deductionsPaise = 0n;

  for (const line of lines) {
    if (line.kind === 'earning') {
      grossPaise += line.amountPaise;
    } else if (line.kind === 'deduction') {
      deductionsPaise += line.amountPaise;
    }
    // Note: line.kind === 'employer_cost' is kept in lines for payslip/cost audit
    // but is NOT subtracted from employee net pay.
  }

  // Net earnings before loan/advance recovery
  const netBeforeAdvances =
    grossPaise > deductionsPaise ? grossPaise - deductionsPaise : 0n;

  // 7. Process Advance Recovery with Clamping
  // Rule: Advance recovery must NEVER cause net pay to drop below 0 paise.
  let remainingNetCapacity = netBeforeAdvances;
  let totalAdvanceRecoveredPaise = 0n;
  const advanceRecoveries: AdvanceRecoveryResult[] = [];

  for (const adv of advances) {
    if (adv.balancePaise <= 0n) {
      advanceRecoveries.push({
        advanceId: adv.id,
        requestedRecoveryPaise: 0n,
        actualRecoveredPaise: 0n,
        remainingBalancePaise: 0n,
        explain: 'Advance has zero outstanding balance.',
      });
      continue;
    }

    // Normal monthly scheduled recovery capped by outstanding balance
    const scheduledRecovery =
      adv.recoveryPerMonthPaise < adv.balancePaise
        ? adv.recoveryPerMonthPaise
        : adv.balancePaise;

    // Clamp by available net capacity
    const actualRecovery =
      scheduledRecovery < remainingNetCapacity
        ? scheduledRecovery
        : remainingNetCapacity;

    remainingNetCapacity -= actualRecovery;
    totalAdvanceRecoveredPaise += actualRecovery;

    const remainingBalance = adv.balancePaise - actualRecovery;

    let advExplain = '';
    if (actualRecovery < scheduledRecovery) {
      advExplain =
        `Advance ${adv.id}: Scheduled recovery ₹${formatPaise(scheduledRecovery)} ` +
        `clamped to ₹${formatPaise(actualRecovery)} to prevent negative net pay. ` +
        `Remaining balance: ₹${formatPaise(remainingBalance)}.`;
    } else {
      advExplain =
        `Advance ${adv.id}: Recovered ₹${formatPaise(actualRecovery)}. ` +
        `Remaining balance: ₹${formatPaise(remainingBalance)}.`;
    }

    advanceRecoveries.push({
      advanceId: adv.id,
      requestedRecoveryPaise: scheduledRecovery,
      actualRecoveredPaise: actualRecovery,
      remainingBalancePaise: remainingBalance,
      explain: advExplain,
    });
  }

  // Final Net Pay (strictly >= 0n)
  const netPaise = netBeforeAdvances - totalAdvanceRecoveredPaise;

  const explain =
    `Payroll for ${employee.name} (${employee.code}) for ${period.year}-${String(period.month).padStart(2, '0')}: ` +
    `Gross Earnings = ₹${formatPaise(grossPaise)}, ` +
    `Deductions = ₹${formatPaise(deductionsPaise)}, ` +
    `Advance Recovery = ₹${formatPaise(totalAdvanceRecoveredPaise)}, ` +
    `Net Pay = ₹${formatPaise(netPaise)}.` +
    (warnings.length > 0 ? ` [${warnings.length} Compliance Warning(s)]` : '');

  return {
    employeeId: employee.id,
    period,
    attendanceSummary,
    lines,
    grossPaise,
    deductionsPaise,
    advanceRecoveries,
    totalAdvanceRecoveredPaise,
    netPaise,
    explain,
    warnings,
  };
}
