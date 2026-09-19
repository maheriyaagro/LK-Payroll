// tests/engine/compare.test.ts
// Hand-built input pairs testing Month-over-Month Payslip Comparison
// Includes explicit TODO placeholders for expected reasons as requested.

import { calculatePayroll } from '../../src/engine/calculate';
import { comparePayroll, ExplainerReason, formatIndianCurrency } from '../../src/engine/compare';
import { PayrollInput, AttendanceRow, Period } from '../../src/engine/types';

// TODO Placeholders for expected reasons
export const TODO_EXPECTED_REASON: ExplainerReason | null = null;

export interface CompareTestCase {
  id: string;
  name: string;
  beforeInput: PayrollInput;
  afterInput: PayrollInput;
  // Expected reason written with TODO comments
  expectedPrimaryReason: ExplainerReason;
  expectUnexplained?: boolean;
}

const basePeriodApril: Period = {
  year: 2026,
  month: 4,
  daysInMonth: 30,
  startDate: '2026-04-01',
  endDate: '2026-04-30',
};

const basePeriodMay: Period = {
  year: 2026,
  month: 5,
  daysInMonth: 31,
  startDate: '2026-05-01',
  endDate: '2026-05-31',
};

const baseEmployee = {
  id: 'emp-compare-01',
  code: 'EMP100',
  name: 'Vikram Malhotra',
  employmentType: 'monthly' as const,
  doj: '2025-01-01',
  isActive: true,
  stateCode: 'MH',
};

const baseComponents = [
  {
    code: 'BASIC',
    label: 'Basic Salary',
    kind: 'earning' as const,
    calcType: 'fixed' as const,
    amountPaise: 4000000n, // ₹40,000
  },
  {
    code: 'HRA',
    label: 'House Rent Allowance',
    kind: 'earning' as const,
    calcType: 'fixed' as const,
    amountPaise: 1600000n, // ₹16,000
  },
];

export const compareTestCases: CompareTestCase[] = [
  // ── Case 1: More or Fewer Paid Days ──────────────────────────────────────
  // TODO: Expected reason is 'more or fewer paid days'
  {
    id: 'case-1-paid-days',
    name: 'Daily wage worker working 24 days in April vs 26 days in May',
    beforeInput: {
      employee: { ...baseEmployee, employmentType: 'daily' },
      components: [
        { code: 'DAILY_WAGE', label: 'Daily Wage', kind: 'earning', calcType: 'fixed', amountPaise: 100000n },
      ],
      attendance: Array.from({ length: 24 }, (_, i) => ({
        workDate: `2026-04-${String(i + 1).padStart(2, '0')}`,
        status: 'P' as const,
      })),
      period: basePeriodApril,
    },
    afterInput: {
      employee: { ...baseEmployee, employmentType: 'daily' },
      components: [
        { code: 'DAILY_WAGE', label: 'Daily Wage', kind: 'earning', calcType: 'fixed', amountPaise: 100000n },
      ],
      attendance: Array.from({ length: 26 }, (_, i) => ({
        workDate: `2026-05-${String(i + 1).padStart(2, '0')}`,
        status: 'P' as const,
      })),
      period: basePeriodMay,
    },
    // TODO: Verify expected reason
    expectedPrimaryReason: 'more or fewer paid days',
  },

  // ── Case 2: LOP (Loss of Pay) ────────────────────────────────────────────
  // TODO: Expected reason is 'lop'
  {
    id: 'case-2-lop',
    name: 'Monthly employee with 0 LOP in April vs 3 LOP days in May',
    beforeInput: {
      employee: baseEmployee,
      components: baseComponents,
      attendance: Array.from({ length: 30 }, (_, i) => ({
        workDate: `2026-04-${String(i + 1).padStart(2, '0')}`,
        status: (i % 7 === 0 ? 'W' : 'P') as any,
      })),
      period: basePeriodApril,
    },
    afterInput: {
      employee: baseEmployee,
      components: baseComponents,
      attendance: Array.from({ length: 31 }, (_, i) => ({
        workDate: `2026-05-${String(i + 1).padStart(2, '0')}`,
        // 3 days absent / LOP
        status: (i < 3 ? 'A' : (i % 7 === 0 ? 'W' : 'P')) as any,
        isLop: i < 3,
      })),
      period: basePeriodMay,
    },
    // TODO: Verify expected reason
    expectedPrimaryReason: 'lop',
  },

  // ── Case 3: OT Hours ─────────────────────────────────────────────────────
  // TODO: Expected reason is 'ot_hours'
  {
    id: 'case-3-ot-hours',
    name: 'Hourly employee with 0 OT in April vs 480 OT minutes (8 hrs) in May',
    beforeInput: {
      employee: { ...baseEmployee, employmentType: 'hourly' },
      components: [
        { code: 'HOURLY_RATE', label: 'Base Hourly Rate', kind: 'earning', calcType: 'fixed', amountPaise: 30000n },
        { code: 'OT', label: 'Overtime Pay', kind: 'earning', calcType: 'fixed', amountPaise: 45000n },
      ],
      attendance: Array.from({ length: 25 }, (_, i) => ({
        workDate: `2026-04-${String(i + 1).padStart(2, '0')}`,
        status: 'P' as const,
        otMinutes: 0,
      })),
      period: basePeriodApril,
    },
    afterInput: {
      employee: { ...baseEmployee, employmentType: 'hourly' },
      components: [
        { code: 'HOURLY_RATE', label: 'Base Hourly Rate', kind: 'earning', calcType: 'fixed', amountPaise: 30000n },
        { code: 'OT', label: 'Overtime Pay', kind: 'earning', calcType: 'fixed', amountPaise: 45000n },
      ],
      attendance: Array.from({ length: 25 }, (_, i) => ({
        workDate: `2026-05-${String(i + 1).padStart(2, '0')}`,
        status: 'P' as const,
        otMinutes: i === 0 ? 480 : 0, // 8 hrs OT on day 1
      })),
      period: basePeriodMay,
    },
    // TODO: Verify expected reason
    expectedPrimaryReason: 'ot_hours',
  },

  // ── Case 4: Advance Recovery ─────────────────────────────────────────────
  // TODO: Expected reason is 'advance_recovery'
  {
    id: 'case-4-advance-recovery',
    name: 'Employee with no advance recovery in April, ₹5,000 recovery in May',
    beforeInput: {
      employee: baseEmployee,
      components: baseComponents,
      attendance: Array.from({ length: 30 }, (_, i) => ({
        workDate: `2026-04-${String(i + 1).padStart(2, '0')}`,
        status: (i % 7 === 0 ? 'W' : 'P') as any,
      })),
      advances: [],
      period: basePeriodApril,
    },
    afterInput: {
      employee: baseEmployee,
      components: baseComponents,
      attendance: Array.from({ length: 31 }, (_, i) => ({
        workDate: `2026-05-${String(i + 1).padStart(2, '0')}`,
        status: (i % 7 === 0 ? 'W' : 'P') as any,
      })),
      advances: [
        {
          id: 'adv-001',
          amountPaise: 2000000n,
          recoveryPerMonthPaise: 500000n, // ₹5,000
          balancePaise: 2000000n,
        },
      ],
      period: basePeriodMay,
    },
    // TODO: Verify expected reason
    expectedPrimaryReason: 'advance_recovery',
  },

  // ── Case 5: Salary Structure Change ──────────────────────────────────────
  // TODO: Expected reason is 'structure_change'
  {
    id: 'case-5-structure-change',
    name: 'Base salary raised from ₹40,000 to ₹50,000 with identical attendance',
    beforeInput: {
      employee: baseEmployee,
      components: [
        { code: 'BASIC', label: 'Basic Salary', kind: 'earning', calcType: 'fixed', amountPaise: 4000000n },
      ],
      attendance: Array.from({ length: 30 }, (_, i) => ({
        workDate: `2026-04-${String(i + 1).padStart(2, '0')}`,
        status: 'P' as const,
      })),
      period: basePeriodApril,
    },
    afterInput: {
      employee: baseEmployee,
      components: [
        { code: 'BASIC', label: 'Basic Salary', kind: 'earning', calcType: 'fixed', amountPaise: 5000000n }, // Raised to ₹50,000
      ],
      attendance: Array.from({ length: 30 }, (_, i) => ({
        workDate: `2026-05-${String(i + 1).padStart(2, '0')}`,
        status: 'P' as const,
      })),
      period: { ...basePeriodMay, daysInMonth: 30 }, // normalized to isolate structure change
    },
    // TODO: Verify expected reason
    expectedPrimaryReason: 'structure_change',
  },

  // ── Case 6: New Joiner ───────────────────────────────────────────────────
  // TODO: Expected reason is 'new_joiner'
  {
    id: 'case-6-new-joiner',
    name: 'New employee joined mid-month on 15 May',
    beforeInput: {
      employee: { ...baseEmployee, doj: '2026-05-15' },
      components: baseComponents,
      attendance: [], // not employed in April
      period: basePeriodApril,
    },
    afterInput: {
      employee: { ...baseEmployee, doj: '2026-05-15' },
      components: baseComponents,
      attendance: Array.from({ length: 17 }, (_, i) => ({
        workDate: `2026-05-${String(i + 15).padStart(2, '0')}`,
        status: 'P' as const,
      })),
      period: basePeriodMay,
    },
    // TODO: Verify expected reason
    expectedPrimaryReason: 'new_joiner',
  },

  // ── Case 7: Leaver ───────────────────────────────────────────────────────
  // TODO: Expected reason is 'leaver'
  {
    id: 'case-7-leaver',
    name: 'Employee left mid-month on 10 May',
    beforeInput: {
      employee: baseEmployee,
      components: baseComponents,
      attendance: Array.from({ length: 30 }, (_, i) => ({
        workDate: `2026-04-${String(i + 1).padStart(2, '0')}`,
        status: 'P' as const,
      })),
      period: basePeriodApril,
    },
    afterInput: {
      employee: { ...baseEmployee, dol: '2026-05-10' },
      components: baseComponents,
      attendance: Array.from({ length: 10 }, (_, i) => ({
        workDate: `2026-05-${String(i + 1).padStart(2, '0')}`,
        status: 'P' as const,
      })),
      period: basePeriodMay,
    },
    // TODO: Verify expected reason
    expectedPrimaryReason: 'leaver',
  },

  // ── Case 8: Unexplained Variance ─────────────────────────────────────────
  // TODO: Expected reason is 'unexplained'
  {
    id: 'case-8-unexplained',
    name: 'Arbitrary bonus variance with identical attendance and identical structure',
    beforeInput: {
      employee: baseEmployee,
      components: [
        { code: 'BONUS', label: 'Ad-hoc Bonus', kind: 'earning', calcType: 'fixed', amountPaise: 1000000n },
      ],
      attendance: Array.from({ length: 30 }, (_, i) => ({
        workDate: `2026-04-${String(i + 1).padStart(2, '0')}`,
        status: 'P' as const,
      })),
      period: basePeriodApril,
    },
    afterInput: {
      employee: baseEmployee,
      // Same structure, same attendance, but simulated arbitrary result difference
      components: [
        { code: 'BONUS', label: 'Ad-hoc Bonus', kind: 'earning', calcType: 'fixed', amountPaise: 1000000n },
      ],
      attendance: Array.from({ length: 30 }, (_, i) => ({
        workDate: `2026-05-${String(i + 1).padStart(2, '0')}`,
        status: 'P' as const,
      })),
      period: { ...basePeriodMay, endDate: '2026-05-30', daysInMonth: 30 },
    },
    // TODO: Verify expected reason
    expectedPrimaryReason: 'unexplained',
    expectUnexplained: true,
  },
];

export function runCompareTests() {
  console.log('='.repeat(70));
  console.log('  MONTH-OVER-MONTH PAYSLIP EXPLAINER TEST SUITE');
  console.log('='.repeat(70));

  let passed = 0;
  let failed = 0;

  for (const tc of compareTestCases) {
    const beforeResult = calculatePayroll(tc.beforeInput);
    let afterResult = calculatePayroll(tc.afterInput);

    // If simulating arbitrary unexplained discrepancy (Case 8):
    if (tc.expectUnexplained) {
      afterResult = {
        ...afterResult,
        lines: afterResult.lines.map((l) =>
          l.componentCode === 'BONUS' ? { ...l, amountPaise: 1450000n } : l
        ),
        grossPaise: afterResult.grossPaise + 450000n,
        netPaise: afterResult.netPaise + 450000n,
      };
    }

    const comparison = comparePayroll(
      beforeResult,
      afterResult,
      tc.beforeInput,
      tc.afterInput
    );

    console.log(`\nTest [${tc.id}]: ${tc.name}`);
    console.log(`  Headline: "${comparison.summaryHeadline}"`);
    console.log(`  Changes count: ${comparison.changes.length}`);

    if (comparison.changes.length > 0) {
      const topChange = comparison.changes[0];
      console.log(`  Top change: ${topChange.label} -> delta: ${formatIndianCurrency(topChange.deltaPaise)}, reason: "${topChange.reason}"`);

      // Check if primary expected reason matched
      const hasExpectedReason = comparison.changes.some((c) => c.reason === tc.expectedPrimaryReason);
      if (hasExpectedReason) {
        passed++;
        console.log(`  ✓ Primary reason "${tc.expectedPrimaryReason}" correctly detected.`);
      } else {
        failed++;
        console.error(`  ✗ FAIL: Expected reason "${tc.expectedPrimaryReason}", got:`, comparison.changes.map(c => c.reason));
      }

      if (tc.expectUnexplained) {
        if (comparison.hasUnexplained) {
          passed++;
          console.log(`  ✓ Unexplained variation successfully surfaced to manager.`);
        } else {
          failed++;
          console.error(`  ✗ FAIL: Expected unexplained flag to be true.`);
        }
      }
    } else {
      failed++;
      console.error(`  ✗ FAIL: No changes detected.`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log(`COMPARE TESTS: ${passed} Passed, ${failed} Failed`);
  console.log('='.repeat(70));

  return { passed, failed };
}

// Execute if run directly
if (require.main === module) {
  const res = runCompareTests();
  process.exit(res.failed > 0 ? 1 : 0);
}
