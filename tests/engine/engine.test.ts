// tests/engine/engine.test.ts
// Comprehensive non-golden test suite for the Hajri Payroll Calculation Engine
// All non-golden tests MUST PASS cleanly.

import { calculatePayroll } from '../../src/engine/calculate';
import {
  roundPaise,
  sortComponentsTopologically,
  formatPaise,
} from '../../src/engine/components';
import { summarizeAttendance } from '../../src/engine/attendance';
import { PayrollInput, SalaryComponentInput } from '../../src/engine/types';

export function runNonGoldenTests(): { passed: number; failed: number } {
  console.log('\n' + '='.repeat(80));
  console.log('  NON-GOLDEN ENGINE UNIT TESTS (Must all pass 100%)');
  console.log('='.repeat(80));

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, name: string, detail?: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${name}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${name}`);
      if (detail) console.error(`    Detail: ${detail}`);
      failed++;
    }
  }

  // Test 1: Purity & Determinism
  {
    const input: PayrollInput = {
      employee: {
        id: 'emp-pure',
        code: 'EP01',
        name: 'Purity Test User',
        employmentType: 'monthly',
        doj: '2026-01-01',
        isActive: true,
      },
      components: [
        { code: 'BASIC', label: 'Basic', kind: 'earning', calcType: 'fixed', amountPaise: 4000000n },
        { code: 'HRA', label: 'HRA', kind: 'earning', calcType: 'percent_of', percentOfCode: 'BASIC', amountPaise: 4000n }, // 40%
        { code: 'PF', label: 'PF', kind: 'deduction', calcType: 'percent_of', percentOfCode: 'BASIC', amountPaise: 1200n }, // 12%
      ],
      attendance: Array.from({ length: 30 }, (_, i) => ({
        workDate: `2026-04-${String(i + 1).padStart(2, '0')}`,
        status: 'P' as any,
        workedMinutes: 480,
      })),
      period: { year: 2026, month: 4, daysInMonth: 30, startDate: '2026-04-01', endDate: '2026-04-30' },
    };

    const res1 = calculatePayroll(input);
    const res2 = calculatePayroll(input);

    assert(
      JSON.stringify(res1, (_, v) => (typeof v === 'bigint' ? v.toString() : v)) ===
        JSON.stringify(res2, (_, v) => (typeof v === 'bigint' ? v.toString() : v)),
      'Purity: Calling calculatePayroll twice with identical input yields identical output'
    );
  }

  // Test 2: Circular Dependency Detection
  {
    const circularComponents: SalaryComponentInput[] = [
      { code: 'A', label: 'Comp A', kind: 'earning', calcType: 'percent_of', percentOfCode: 'B', amountPaise: 1000n },
      { code: 'B', label: 'Comp B', kind: 'earning', calcType: 'percent_of', percentOfCode: 'C', amountPaise: 1000n },
      { code: 'C', label: 'Comp C', kind: 'earning', calcType: 'percent_of', percentOfCode: 'A', amountPaise: 1000n },
    ];

    let caughtError: string | null = null;
    try {
      sortComponentsTopologically(circularComponents);
    } catch (err: any) {
      caughtError = err.message;
    }

    assert(
      caughtError !== null && caughtError.includes('Circular dependency detected'),
      'Dependency Graph: Detects 3-node circular reference and throws descriptive error',
      caughtError ?? undefined
    );
  }

  // Test 3: Missing Component Dependency Detection
  {
    const missingDepComponents: SalaryComponentInput[] = [
      { code: 'HRA', label: 'HRA', kind: 'earning', calcType: 'percent_of', percentOfCode: 'NON_EXISTENT', amountPaise: 4000n },
    ];

    let caughtError: string | null = null;
    try {
      sortComponentsTopologically(missingDepComponents);
    } catch (err: any) {
      caughtError = err.message;
    }

    assert(
      caughtError !== null && caughtError.includes('depends on non-existent component'),
      'Dependency Graph: Throws error when percent_of references a missing component',
      caughtError ?? undefined
    );
  }

  // Test 4: Commercial Half-Up Integer Rounding Rule
  {
    // Test half rounds up: 105 / 10 = 10.5 -> 11
    const r1 = roundPaise(105n, 10n);
    assert(r1 === 11n, `roundPaise(105n, 10n) === 11n (got ${r1}n)`);

    // Test below half rounds down: 104 / 10 = 10.4 -> 10
    const r2 = roundPaise(104n, 10n);
    assert(r2 === 10n, `roundPaise(104n, 10n) === 10n (got ${r2}n)`);

    // Test negative half rounds down towards -infinity (or symmetric): -105 / 10 -> -11
    const r3 = roundPaise(-105n, 10n);
    assert(r3 === -11n, `roundPaise(-105n, 10n) === -11n (got ${r3}n)`);

    // Test zero denominator
    const r4 = roundPaise(500n, 0n);
    assert(r4 === 0n, `roundPaise(500n, 0n) === 0n safe zero guard (got ${r4}n)`);
  }

  // Test 5: Advance Clamping (Net pay never drops below 0)
  {
    const input: PayrollInput = {
      employee: {
        id: 'emp-clamp',
        code: 'EC01',
        name: 'Clamped User',
        employmentType: 'monthly',
        doj: '2026-01-01',
        isActive: true,
      },
      components: [
        { code: 'BASIC', label: 'Basic', kind: 'earning', calcType: 'fixed', amountPaise: 1000000n }, // ₹10,000
      ],
      attendance: Array.from({ length: 30 }, (_, i) => ({
        workDate: `2026-04-${String(i + 1).padStart(2, '0')}`,
        status: 'P' as any,
        workedMinutes: 480,
      })),
      advances: [
        {
          id: 'adv-huge',
          amountPaise: 5000000n,
          recoveryPerMonthPaise: 2500000n, // ₹25,000 recovery requested, but gross is only ₹10,000!
          balancePaise: 5000000n,
        },
      ],
      period: { year: 2026, month: 4, daysInMonth: 30, startDate: '2026-04-01', endDate: '2026-04-30' },
    };

    const res = calculatePayroll(input);
    assert(res.netPaise === 0n, `Advance Clamping: netPaise clamped to 0n, never negative (got ${res.netPaise}n)`);
    assert(
      res.totalAdvanceRecoveredPaise === 1000000n,
      `Advance Clamping: Only ₹10,000 recovered out of ₹25,000 requested (got ${res.totalAdvanceRecoveredPaise}n)`
    );
    assert(
      res.advanceRecoveries[0].actualRecoveredPaise === 1000000n,
      'Advance Clamping: Detailed advance record reflects clamped amount'
    );
  }

  // Test 6: Zero-day month guard (Returns 0, no NaN, no thrown error)
  {
    const input: PayrollInput = {
      employee: {
        id: 'emp-zero',
        code: 'EZ01',
        name: 'Zero Day Worker',
        employmentType: 'monthly',
        doj: '2026-01-01',
        isActive: true,
      },
      components: [
        { code: 'BASIC', label: 'Basic', kind: 'earning', calcType: 'fixed', amountPaise: 5000000n },
      ],
      attendance: [],
      period: { year: 2026, month: 0, daysInMonth: 0, startDate: '2026-00-00', endDate: '2026-00-00' },
    };

    let thrownError = false;
    let res: any;
    try {
      res = calculatePayroll(input);
    } catch {
      thrownError = true;
    }

    assert(!thrownError, 'Zero-day Month: Does not throw error');
    assert(res && res.netPaise === 0n, 'Zero-day Month: Returns netPaise === 0n');
    assert(res && res.grossPaise === 0n, 'Zero-day Month: Returns grossPaise === 0n');
  }

  // Test 7: Plain English explain string on all components and overall result
  {
    const input: PayrollInput = {
      employee: {
        id: 'emp-exp',
        code: 'EE01',
        name: 'Explainer Check',
        employmentType: 'monthly',
        doj: '2026-01-01',
        isActive: true,
      },
      components: [
        { code: 'BASIC', label: 'Basic Salary', kind: 'earning', calcType: 'fixed', amountPaise: 3000000n },
        { code: 'HRA', label: 'House Rent Allowance', kind: 'earning', calcType: 'percent_of', percentOfCode: 'BASIC', amountPaise: 4000n },
      ],
      attendance: Array.from({ length: 30 }, (_, i) => ({
        workDate: `2026-04-${String(i + 1).padStart(2, '0')}`,
        status: 'P' as any,
        workedMinutes: 480,
      })),
      period: { year: 2026, month: 4, daysInMonth: 30, startDate: '2026-04-01', endDate: '2026-04-30' },
    };

    const res = calculatePayroll(input);
    assert(res.explain.length > 20, 'Explainer: Overall result includes detailed explanation');
    assert(
      res.lines.every((l) => l.explain && l.explain.length > 10),
      'Explainer: Every evaluated component line contains an explain string'
    );
  }

  return { passed, failed };
}
