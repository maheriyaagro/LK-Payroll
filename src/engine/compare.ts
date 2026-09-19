// src/engine/compare.ts
// Pure deterministic month-over-month payslip comparison engine.
// Zero LLM dependencies. Strictly rule-based derivation of payroll variations.

import {
  PayrollResult,
  PayrollInput,
  PayrollLine,
  Period,
} from './types';
import { loadRulePack } from './rules/loader';

export type ExplainerReason =
  | 'more or fewer paid days'
  | 'lop'
  | 'ot_hours'
  | 'advance_recovery'
  | 'structure_change'
  | 'rule_pack_version_change'
  | 'new_joiner'
  | 'leaver'
  | 'unexplained';

export interface ComponentChange {
  componentCode: string;
  label: string;
  kind: 'earning' | 'deduction' | 'employer_cost';
  beforePaise: bigint;
  afterPaise: bigint;
  deltaPaise: bigint; // after - before
  reason: ExplainerReason;
  reasonLabel: string;
  explain: string;
}

export interface PayrollComparison {
  employeeId: string;
  beforePeriod: Period;
  afterPeriod: Period;
  netBeforePaise: bigint;
  netAfterPaise: bigint;
  netDeltaPaise: bigint; // after - before
  grossBeforePaise: bigint;
  grossAfterPaise: bigint;
  grossDeltaPaise: bigint;
  deductionsBeforePaise: bigint;
  deductionsAfterPaise: bigint;
  deductionsDeltaPaise: bigint;
  summaryHeadline: string;
  changes: ComponentChange[];
  hasUnexplained: boolean;
  unexplainedCount: number;
}

export function formatIndianCurrency(paise: bigint): string {
  const isNegative = paise < 0n;
  const absPaise = isNegative ? -paise : paise;
  const rupees = Number(absPaise) / 100;
  return `${isNegative ? '-' : ''}₹${rupees.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

const STATUTORY_CODES = ['PF', 'PF_EE', 'PF_EMP', 'ESI', 'ESI_EE', 'ESI_EMP', 'PT', 'TDS', 'TDS_194J'];
const OVERTIME_CODES = ['OT', 'OVERTIME', 'OT_RATE', 'OT_PAY', 'OT_HOURS'];
const ADVANCE_CODES = ['ADV_REC', 'ADVANCE', 'ADVANCE_RECOVERY', 'ADV_DEDUCTION'];

/**
 * Checks if a statutory rule pack version changed between two periods.
 */
function hasRulePackVersionChanged(ruleName: string, beforePeriod: Period, afterPeriod: Period, stateCode?: string): boolean {
  try {
    const beforePack = loadRulePack(ruleName, beforePeriod, stateCode);
    const afterPack = loadRulePack(ruleName, afterPeriod, stateCode);
    return beforePack.version !== afterPack.version;
  } catch {
    return false;
  }
}

/**
 * Compares two PayrollResult objects for the same employee and returns
 * an ordered list of changes with deterministic reasons.
 */
export function comparePayroll(
  before: PayrollResult,
  after: PayrollResult,
  beforeInput?: PayrollInput,
  afterInput?: PayrollInput
): PayrollComparison {
  const changes: ComponentChange[] = [];

  // Map of all component codes present across before and after
  const allCodes = new Set<string>();
  for (const l of before.lines) allCodes.add(l.componentCode);
  for (const l of after.lines) allCodes.add(l.componentCode);

  // If advance recoveries exist as deductions outside lines
  if (before.totalAdvanceRecoveredPaise > 0n || after.totalAdvanceRecoveredPaise > 0n) {
    allCodes.add('ADV_REC');
  }

  // Attendance differences
  const payableDaysBefore = before.attendanceSummary.payableCentiDays;
  const payableDaysAfter = after.attendanceSummary.payableCentiDays;
  const paidDaysDiff = payableDaysAfter !== payableDaysBefore;

  const lopBefore = before.attendanceSummary.lopCentiDays;
  const lopAfter = after.attendanceSummary.lopCentiDays;
  const lopDiff = lopAfter !== lopBefore;

  const otBefore = before.attendanceSummary.otMinutes;
  const otAfter = after.attendanceSummary.otMinutes;
  const otDiff = otAfter !== otBefore;

  // Lifecycle checks: joiner / leaver
  const doj = afterInput?.employee.doj || beforeInput?.employee.doj;
  const dol = afterInput?.employee.dol || beforeInput?.employee.dol;

  const isNewJoiner = Boolean(
    (doj && doj > after.period.startDate && doj <= after.period.endDate) ||
    (payableDaysBefore === 0n && payableDaysAfter > 0n)
  );

  const isLeaver = Boolean(
    (dol && dol >= after.period.startDate && dol <= after.period.endDate) ||
    (payableDaysBefore > 0n && payableDaysAfter === 0n)
  );

  // Analyze each component
  for (const code of Array.from(allCodes)) {
    const beforeLine = before.lines.find((l) => l.componentCode === code);
    const afterLine = after.lines.find((l) => l.componentCode === code);

    let beforeAmount = beforeLine?.amountPaise ?? 0n;
    let afterAmount = afterLine?.amountPaise ?? 0n;
    let label = afterLine?.label || beforeLine?.label || code;
    let kind = afterLine?.kind || beforeLine?.kind || 'earning';

    // Handle advance recovery if not in lines
    if (code === 'ADV_REC') {
      if (beforeAmount === 0n && before.totalAdvanceRecoveredPaise > 0n) {
        beforeAmount = before.totalAdvanceRecoveredPaise;
      }
      if (afterAmount === 0n && after.totalAdvanceRecoveredPaise > 0n) {
        afterAmount = after.totalAdvanceRecoveredPaise;
      }
      label = 'Salary Advance Recovery';
      kind = 'deduction';
    }

    const delta = afterAmount - beforeAmount;
    if (delta === 0n) {
      continue; // No variation
    }

    let reason: ExplainerReason = 'unexplained';
    let reasonLabel = 'Unexplained variation';
    let explain = '';

    // Check 1: New Joiner
    if (isNewJoiner) {
      reason = 'new_joiner';
      reasonLabel = 'New joiner';
      explain = `Employee joined on ${doj || 'mid-period'} with partial or starting pay.`;
    }
    // Check 2: Leaver
    else if (isLeaver) {
      reason = 'leaver';
      reasonLabel = 'Leaver';
      explain = `Employee separated from service on ${dol || 'mid-period'}.`;
    }
    // Check 3: Advance Recovery
    else if (
      ADVANCE_CODES.includes(code.toUpperCase()) ||
      label.toLowerCase().includes('advance') ||
      code === 'ADV_REC'
    ) {
      reason = 'advance_recovery';
      reasonLabel = 'Advance recovery';
      explain = delta > 0n
        ? `Advance installment recovery increased by ${formatIndianCurrency(delta)}.`
        : `Advance installment recovery reduced by ${formatIndianCurrency(-delta)}.`;
    }
    // Check 4: Overtime Hours
    else if (
      (OVERTIME_CODES.includes(code.toUpperCase()) || label.toLowerCase().includes('overtime')) &&
      otDiff
    ) {
      reason = 'ot_hours';
      const otDiffHours = Number(otAfter - otBefore) / 60;
      reasonLabel = 'OT hours';
      explain = otDiffHours > 0
        ? `Overtime increased by ${otDiffHours.toFixed(1)} hrs (${formatIndianCurrency(delta)}).`
        : `Overtime decreased by ${Math.abs(otDiffHours).toFixed(1)} hrs (${formatIndianCurrency(delta)}).`;
    }
    // Check 5: Salary Structure Change
    else {
      const beforeComp = beforeInput?.components.find((c) => c.code === code);
      const afterComp = afterInput?.components.find((c) => c.code === code);

      const hasStructureChange = Boolean(
        (!beforeComp && afterComp) || // Added
        (beforeComp && !afterComp) || // Removed
        (beforeComp && afterComp && beforeComp.amountPaise !== afterComp.amountPaise) || // Base rate changed
        (beforeComp && afterComp && beforeComp.calcType !== afterComp.calcType) // Type changed
      );

      if (hasStructureChange) {
        reason = 'structure_change';
        reasonLabel = 'Structure change';
        if (!beforeComp && afterComp) {
          explain = `Component newly added to salary structure (${formatIndianCurrency(afterAmount)}).`;
        } else if (beforeComp && !afterComp) {
          explain = `Component removed from salary structure (was ${formatIndianCurrency(beforeAmount)}).`;
        } else {
          explain = `Base component rate updated from ${formatIndianCurrency(beforeComp!.amountPaise)} to ${formatIndianCurrency(afterComp!.amountPaise)}.`;
        }
      }
      // Check 6: Statutory Rule Pack Version Change
      else if (STATUTORY_CODES.includes(code.toUpperCase())) {
        const stateCode = afterInput?.employee.stateCode || beforeInput?.employee.stateCode;
        let ruleName = 'pf';
        if (code.toUpperCase().includes('ESI')) ruleName = 'esi';
        if (code.toUpperCase().includes('PT')) ruleName = 'pt';

        const versionChanged = hasRulePackVersionChanged(ruleName, before.period, after.period, stateCode);
        if (versionChanged) {
          reason = 'rule_pack_version_change';
          reasonLabel = 'Rule pack version change';
          explain = `Statutory ${ruleName.toUpperCase()} regulation version changed between ${before.period.year}-${before.period.month} and ${after.period.year}-${after.period.month}.`;
        } else if (paidDaysDiff || lopDiff) {
          // If statutory component changed due to attendance / wage change
          if (lopDiff) {
            reason = 'lop';
            const lopDiffDays = Number(lopAfter - lopBefore) / 100;
            reasonLabel = 'LOP';
            explain = `Statutory contribution adjusted due to ${lopDiffDays > 0 ? '+' : ''}${lopDiffDays} LOP days.`;
          } else {
            reason = 'more or fewer paid days';
            const dayDiff = Number(payableDaysAfter - payableDaysBefore) / 100;
            reasonLabel = 'More or fewer paid days';
            explain = `Statutory contribution adjusted due to ${dayDiff > 0 ? '+' : ''}${dayDiff} payable days.`;
          }
        } else {
          // If gross changed due to structure, it could cascade, but if isolated:
          reason = 'unexplained';
          reasonLabel = 'Unexplained variation';
          explain = `Statutory deduction varied by ${formatIndianCurrency(delta)} without rule pack or attendance trigger.`;
        }
      }
      // Check 7: LOP (Loss of Pay)
      else if (lopDiff) {
        const lopDiffDays = Number(lopAfter - lopBefore) / 100;
        const isConsistent = (lopDiffDays > 0 && delta < 0n) || (lopDiffDays < 0 && delta > 0n);
        if (kind === 'earning' && isConsistent) {
          reason = 'lop';
          reasonLabel = 'LOP';
          explain = lopDiffDays > 0
            ? `Pay reduced due to ${lopDiffDays} additional unpaid LOP day(s).`
            : `Pay restored from ${Math.abs(lopDiffDays)} fewer unpaid LOP day(s).`;
        } else {
          reason = 'unexplained';
          reasonLabel = 'Unexplained variation';
          explain = `Component varied by ${formatIndianCurrency(delta)} which does not correlate with LOP variation.`;
        }
      }
      // Check 8: More or Fewer Paid Days
      else if (paidDaysDiff) {
        const dayDiff = Number(payableDaysAfter - payableDaysBefore) / 100;
        const isConsistent = (dayDiff > 0 && delta > 0n) || (dayDiff < 0 && delta < 0n);
        if (kind === 'earning' && isConsistent) {
          reason = 'more or fewer paid days';
          reasonLabel = 'More or fewer paid days';
          explain = dayDiff > 0
            ? `Earned for ${dayDiff} more payable day(s) worked.`
            : `Earned for ${Math.abs(dayDiff)} fewer payable day(s) in month.`;
        } else {
          reason = 'unexplained';
          reasonLabel = 'Unexplained variation';
          explain = `Component varied by ${formatIndianCurrency(delta)} which does not correlate with payable days worked.`;
        }
      }
      // Check 9: Unexplained
      else {
        reason = 'unexplained';
        reasonLabel = 'Unexplained variation';
        explain = `Component changed by ${formatIndianCurrency(delta)} without matching attendance, structure, or statutory rule trigger.`;
      }
    }

    changes.push({
      componentCode: code,
      label,
      kind,
      beforePaise: beforeAmount,
      afterPaise: afterAmount,
      deltaPaise: delta,
      reason,
      reasonLabel,
      explain,
    });
  }

  // Sort changes by absolute delta descending (highest monetary impact first)
  changes.sort((a, b) => {
    const absA = a.deltaPaise < 0n ? -a.deltaPaise : a.deltaPaise;
    const absB = b.deltaPaise < 0n ? -b.deltaPaise : b.deltaPaise;
    if (absB > absA) return 1;
    if (absB < absA) return -1;
    return 0;
  });

  const netDelta = after.netPaise - before.netPaise;
  const grossDelta = after.grossPaise - before.grossPaise;
  const deductionsDelta = after.deductionsPaise - before.deductionsPaise;

  const sign = netDelta > 0n ? '+' : '';
  const summaryHeadline = netDelta === 0n
    ? 'Take-home unchanged since last month'
    : `Take-home changed by ${sign}${formatIndianCurrency(netDelta)} since last month`;

  const unexplainedCount = changes.filter((c) => c.reason === 'unexplained').length;

  return {
    employeeId: after.employeeId,
    beforePeriod: before.period,
    afterPeriod: after.period,
    netBeforePaise: before.netPaise,
    netAfterPaise: after.netPaise,
    netDeltaPaise: netDelta,
    grossBeforePaise: before.grossPaise,
    grossAfterPaise: after.grossPaise,
    grossDeltaPaise: grossDelta,
    deductionsBeforePaise: before.deductionsPaise,
    deductionsAfterPaise: after.deductionsPaise,
    deductionsDeltaPaise: deductionsDelta,
    summaryHeadline,
    changes,
    hasUnexplained: unexplainedCount > 0,
    unexplainedCount,
  };
}
