// tests/engine/golden.test.ts
// Golden Test Cases for Hajri Payroll Engine
// NOTE: As requested, expected values are left as explicit TODO placeholders
// for the user to inspect computed values and fill in by hand.

import { calculatePayroll } from '../../src/engine/calculate';
import { formatPaise } from '../../src/engine/components';
import { PayrollInput, AttendanceRow } from '../../src/engine/types';

// Placeholder value representing unverified expectation
export const TODO_EXPECTED_NET_PAISE: bigint | null = null;

export interface GoldenTestCase {
  id: string;
  name: string;
  input: PayrollInput;
  // User will replace TODO_EXPECTED_NET_PAISE with hand-calculated bigint paise
  expectedNetPaise: bigint | null;
}

export const goldenTestCases: GoldenTestCase[] = [
  // 1. Full month, monthly employee, no deductions
  {
    id: 'case-1',
    name: 'Full month, monthly employee, no deductions',
    input: {
      employee: {
        id: 'emp-001',
        code: 'EMP001',
        name: 'Aarav Mehta',
        employmentType: 'monthly',
        doj: '2025-01-01',
        isActive: true,
      },
      components: [
        {
          code: 'BASIC',
          label: 'Basic Salary',
          kind: 'earning',
          calcType: 'fixed',
          amountPaise: 5000000n, // ₹50,000.00
        },
      ],
      attendance: Array.from({ length: 30 }, (_, i) => ({
        workDate: `2026-04-${String(i + 1).padStart(2, '0')}`,
        status: (i % 7 === 0 ? 'W' : 'P') as any, // 1st, 8th, 15th, 22nd, 29th weekly off, rest present
        workedMinutes: i % 7 === 0 ? 0 : 480,
      })),
      period: {
        year: 2026,
        month: 4,
        daysInMonth: 30,
        startDate: '2026-04-01',
        endDate: '2026-04-30',
      },
    },
    expectedNetPaise: TODO_EXPECTED_NET_PAISE,
  },

  // 2. Mid-month joiner and mid-month leaver
  {
    id: 'case-2',
    name: 'Mid-month joiner and mid-month leaver',
    input: {
      employee: {
        id: 'emp-002',
        code: 'EMP002',
        name: 'Neha Gupta',
        employmentType: 'monthly',
        doj: '2026-04-10', // Joined on 10th
        dol: '2026-04-20', // Left on 20th (11 active days: 10th to 20th inclusive)
        isActive: false,
      },
      components: [
        {
          code: 'BASIC',
          label: 'Basic Salary',
          kind: 'earning',
          calcType: 'fixed',
          amountPaise: 3000000n, // ₹30,000.00
        },
      ],
      attendance: Array.from({ length: 11 }, (_, i) => ({
        workDate: `2026-04-${String(i + 10).padStart(2, '0')}`,
        status: 'P' as any,
        workedMinutes: 480,
      })),
      period: {
        year: 2026,
        month: 4,
        daysInMonth: 30,
        startDate: '2026-04-01',
        endDate: '2026-04-30',
      },
    },
    expectedNetPaise: TODO_EXPECTED_NET_PAISE,
  },

  // 3. 3 LOP days
  {
    id: 'case-3',
    name: '3 LOP days',
    input: {
      employee: {
        id: 'emp-003',
        code: 'EMP003',
        name: 'Rohan Deshmukh',
        employmentType: 'monthly',
        doj: '2025-01-01',
        isActive: true,
      },
      components: [
        {
          code: 'BASIC',
          label: 'Basic Salary',
          kind: 'earning',
          calcType: 'fixed',
          amountPaise: 6000000n, // ₹60,000.00
        },
      ],
      attendance: Array.from({ length: 30 }, (_, i) => {
        const day = i + 1;
        const isLopDay = day === 5 || day === 12 || day === 19; // 3 LOP days
        return {
          workDate: `2026-04-${String(day).padStart(2, '0')}`,
          status: isLopDay ? ('A' as any) : day % 7 === 0 ? ('W' as any) : ('P' as any),
          workedMinutes: isLopDay || day % 7 === 0 ? 0 : 480,
        };
      }),
      period: {
        year: 2026,
        month: 4,
        daysInMonth: 30,
        startDate: '2026-04-01',
        endDate: '2026-04-30',
      },
    },
    expectedNetPaise: TODO_EXPECTED_NET_PAISE,
  },

  // 4. Daily-wage employee, 22 days worked, 6 hours OT
  {
    id: 'case-4',
    name: 'Daily-wage employee, 22 days worked, 6 hours OT',
    input: {
      employee: {
        id: 'emp-004',
        code: 'EMP004',
        name: 'Vikram Chaurasia',
        employmentType: 'daily',
        doj: '2025-06-01',
        isActive: true,
      },
      components: [
        {
          code: 'DAILY_WAGE',
          label: 'Daily Wage Rate',
          kind: 'earning',
          calcType: 'fixed',
          amountPaise: 80000n, // ₹800.00 / day
        },
        {
          code: 'OT_RATE',
          label: 'Overtime Hourly Rate',
          kind: 'earning',
          calcType: 'fixed',
          amountPaise: 15000n, // ₹150.00 / hr
        },
      ],
      attendance: [
        // 22 days present, with 6 hours OT total (360 minutes across 3 days)
        ...Array.from({ length: 22 }, (_, i) => ({
          workDate: `2026-04-${String(i + 1).padStart(2, '0')}`,
          status: 'P' as any,
          workedMinutes: 480,
          otMinutes: i < 3 ? 120 : 0, // 3 days × 120 mins = 360 mins = 6 hours OT
        })),
        // 8 days unworked (Sundays/Absent)
        ...Array.from({ length: 8 }, (_, i) => ({
          workDate: `2026-04-${String(i + 23).padStart(2, '0')}`,
          status: 'W' as any,
          workedMinutes: 0,
        })),
      ],
      period: {
        year: 2026,
        month: 4,
        daysInMonth: 30,
        startDate: '2026-04-01',
        endDate: '2026-04-30',
      },
    },
    expectedNetPaise: TODO_EXPECTED_NET_PAISE,
  },

  // 5. Advance recovery that exceeds net pay (must clamp, never go negative)
  {
    id: 'case-5',
    name: 'Advance recovery that exceeds net pay (must clamp, never go negative)',
    input: {
      employee: {
        id: 'emp-005',
        code: 'EMP005',
        name: 'Sunil Rathore',
        employmentType: 'monthly',
        doj: '2025-01-01',
        isActive: true,
      },
      components: [
        {
          code: 'BASIC',
          label: 'Basic Salary',
          kind: 'earning',
          calcType: 'fixed',
          amountPaise: 2500000n, // ₹25,000.00
        },
      ],
      attendance: Array.from({ length: 30 }, (_, i) => ({
        workDate: `2026-04-${String(i + 1).padStart(2, '0')}`,
        status: 'P' as any,
        workedMinutes: 480,
      })),
      advances: [
        {
          id: 'adv-999',
          amountPaise: 10000000n,          // ₹1,00,000 loan
          recoveryPerMonthPaise: 3500000n, // ₹35,000/mo requested recovery (exceeds ₹25,000 net pay!)
          balancePaise: 8000000n,          // ₹80,000 remaining balance
        },
      ],
      period: {
        year: 2026,
        month: 4,
        daysInMonth: 30,
        startDate: '2026-04-01',
        endDate: '2026-04-30',
      },
    },
    expectedNetPaise: TODO_EXPECTED_NET_PAISE,
  },

  // 6. Zero-day month (must return net 0, not NaN, not throw)
  {
    id: 'case-6',
    name: 'Zero-day month (must return net 0, not NaN, not throw)',
    input: {
      employee: {
        id: 'emp-006',
        code: 'EMP006',
        name: 'Kavita Iyer',
        employmentType: 'monthly',
        doj: '2025-01-01',
        isActive: true,
      },
      components: [
        {
          code: 'BASIC',
          label: 'Basic Salary',
          kind: 'earning',
          calcType: 'fixed',
          amountPaise: 4000000n, // ₹40,000.00
        },
      ],
      attendance: [],
      period: {
        year: 2026,
        month: 0,
        daysInMonth: 0, // Edge case: 0 days
        startDate: '2026-00-00',
        endDate: '2026-00-00',
      },
    },
    expectedNetPaise: TODO_EXPECTED_NET_PAISE,
  },

  // 7. Leap-year February (29 days in month)
  {
    id: 'case-7',
    name: 'Leap-year February',
    input: {
      employee: {
        id: 'emp-007',
        code: 'EMP007',
        name: 'Deepak Verma',
        employmentType: 'monthly',
        doj: '2024-01-01',
        isActive: true,
      },
      components: [
        {
          code: 'BASIC',
          label: 'Basic Salary',
          kind: 'earning',
          calcType: 'fixed',
          amountPaise: 5800000n, // ₹58,000.00
        },
      ],
      attendance: Array.from({ length: 29 }, (_, i) => ({
        workDate: `2024-02-${String(i + 1).padStart(2, '0')}`,
        status: (i % 7 === 3 ? 'W' : 'P') as any, // 4 weekly offs, 25 present = 29 payable
        workedMinutes: i % 7 === 3 ? 0 : 480,
      })),
      period: {
        year: 2024,
        month: 2,
        daysInMonth: 29, // Leap year February!
        startDate: '2024-02-01',
        endDate: '2024-02-29',
      },
    },
    expectedNetPaise: TODO_EXPECTED_NET_PAISE,
  },
];

/**
 * Runs the golden tests and prints loud, clear diffs showing computed vs expected values.
 */
export function runGoldenTests(): { passed: number; failed: number } {
  console.log('\n' + '='.repeat(80));
  console.log('  GOLDEN TESTS (Expected values left as TODO for user verification)');
  console.log('='.repeat(80));

  let passed = 0;
  let failed = 0;

  for (const testCase of goldenTestCases) {
    const result = calculatePayroll(testCase.input);
    const computedNet = result.netPaise;

    if (testCase.expectedNetPaise !== null && computedNet === testCase.expectedNetPaise) {
      console.log(`\n  ✓ PASS: [${testCase.id}] ${testCase.name}`);
      console.log(`    Computed Net Pay: ${computedNet}n (₹${formatPaise(computedNet)})`);
      passed++;
    } else {
      console.log(`\n  ✗ FAIL (LOUD DIFF): [${testCase.id}] ${testCase.name}`);
      console.log('    ┌' + '─'.repeat(74) + '┐');
      console.log(`    │  COMPUTED BY ENGINE:  ${computedNet.toString().padEnd(16)} (₹${formatPaise(computedNet)})`.padEnd(75) + '│');
      if (testCase.expectedNetPaise === null) {
        console.log(`    │  EXPECTED (USER):     [TODO: Fill in expectedNetPaise by hand]`.padEnd(75) + '│');
        console.log(`    │  DIFF: Expected [TODO placeholder], but Engine computed ${computedNet}n`.padEnd(75) + '│');
      } else {
        console.log(`    │  EXPECTED (USER):     ${testCase.expectedNetPaise.toString().padEnd(16)} (₹${formatPaise(testCase.expectedNetPaise)})`.padEnd(75) + '│');
        console.log(`    │  DIFF: ${computedNet - testCase.expectedNetPaise}n paise discrepancy`.padEnd(75) + '│');
      }
      console.log('    └' + '─'.repeat(74) + '┘');
      console.log(`    Explanation: ${result.explain}`);
      failed++;
    }
  }

  return { passed, failed };
}
