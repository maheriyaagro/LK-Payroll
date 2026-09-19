// tests/engine/statutory.test.ts
// Comprehensive test suite for Versioned Statutory Rules (PF, ESI, PT, TDS stub) and Indian Wage Code Validator.
// As requested:
// - Rule loader tests and unit tests MUST PASS 100%.
// - Statutory golden edge cases have expectedNetPaise set to TODO placeholder and fail loudly with diffs.

import { calculatePayroll } from '../../src/engine/calculate';
import { loadRulePack } from '../../src/engine/rules/loader';
import { pf, esi, pt, tds } from '../../src/engine/statutory';
import { wageCodeCheck } from '../../src/engine/validators';
import { formatPaise } from '../../src/engine/components';
import { PayrollInput, Period } from '../../src/engine/types';

// TODO placeholder for user to verify and fill in by hand
export const TODO_EXPECTED_NET_PAISE: bigint | null = null;

export function runStatutoryUnitTests(): { passed: number; failed: number } {
  console.log('\n' + '='.repeat(80));
  console.log('  STATUTORY RULE LOADER & VALIDATOR UNIT TESTS (Must all pass 100%)');
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

  const period2026: Period = {
    year: 2026,
    month: 4,
    daysInMonth: 30,
    startDate: '2026-04-01',
    endDate: '2026-04-30',
  };

  // 1. Rule Loader: Successfully loads active PF rule
  {
    const pfRule = loadRulePack('pf', period2026);
    assert(
      pfRule.rule === 'pf' && pfRule.params.employee_rate_bps === 1200 && pfRule.verify_with_ca === true,
      'Rule Loader: Loads active PF rule pack with verify_with_ca = true'
    );
  }

  // 2. Rule Loader: Successfully loads active ESI rule
  {
    const esiRule = loadRulePack('esi', period2026);
    assert(
      esiRule.rule === 'esi' && esiRule.params.employee_rate_bps === 75 && esiRule.params.gross_ceiling_paise === 2100000,
      'Rule Loader: Loads active ESI rule pack (0.75% employee, 3.25% employer, ₹21,000 ceiling)'
    );
  }

  // 3. Rule Loader: Successfully loads active PT rule for Maharashtra (MH)
  {
    const ptRule = loadRulePack('pt', period2026, 'MH');
    assert(
      ptRule.rule === 'pt' && ptRule.state === 'MH' && Array.isArray(ptRule.params.slabs),
      'Rule Loader: Loads active PT rule pack for Maharashtra (MH)'
    );
  }

  // 4. Rule Loader: Throws clear error for date preceding earliest rule pack (Never falls back silently)
  {
    const ancientPeriod: Period = {
      year: 2018,
      month: 1,
      daysInMonth: 31,
      startDate: '2018-01-01',
      endDate: '2018-01-31',
    };

    let caughtError = '';
    try {
      loadRulePack('pf', ancientPeriod);
    } catch (err: any) {
      caughtError = err.message;
    }

    assert(
      caughtError.includes('No rule pack found for rule "pf" effective on or before period start date "2018-01-01"'),
      'Rule Loader: Throws explicit error for dates preceding effective_from (no silent fallback)',
      caughtError
    );
  }

  // 5. Rule Loader: Throws clear error for unregistered rule name
  {
    let caughtError = '';
    try {
      loadRulePack('non_existent_rule', period2026);
    } catch (err: any) {
      caughtError = err.message;
    }

    assert(
      caughtError.includes('No rule pack registered for rule "non_existent_rule"'),
      'Rule Loader: Throws explicit error for unknown rule name',
      caughtError
    );
  }

  // 6. Wage Code Validator: Detects breach when Basic + DA < 50% of total remuneration
  {
    const input: PayrollInput = {
      employee: { id: 'emp-wc1', code: 'WC01', name: 'Wage Code Test', employmentType: 'monthly', doj: '2026-01-01', isActive: true },
      components: [
        { code: 'BASIC', label: 'Basic', kind: 'earning', calcType: 'fixed', amountPaise: 2000000n }, // ₹20,000 (33.3%)
        { code: 'SPECIAL_ALLOWANCE', label: 'Special Allowance', kind: 'earning', calcType: 'fixed', amountPaise: 4000000n }, // ₹40,000
      ],
      attendance: [],
      period: period2026,
    };

    const check = wageCodeCheck(input);
    assert(
      !check.isCompliant && check.warning !== undefined && check.warning.includes('Indian Code on Wages warning'),
      'Wage Code 50% Rule: Triggers warning when Basic + DA is below 50% of total remuneration'
    );
  }

  // 7. Wage Code Validator: Passes cleanly when Basic + DA >= 50% of total remuneration
  {
    const input: PayrollInput = {
      employee: { id: 'emp-wc2', code: 'WC02', name: 'Wage Code Compliant', employmentType: 'monthly', doj: '2026-01-01', isActive: true },
      components: [
        { code: 'BASIC', label: 'Basic', kind: 'earning', calcType: 'fixed', amountPaise: 3000000n }, // ₹30,000 (50%)
        { code: 'HRA', label: 'HRA', kind: 'earning', calcType: 'fixed', amountPaise: 3000000n }, // ₹30,000 (50%)
      ],
      attendance: [],
      period: period2026,
    };

    const check = wageCodeCheck(input);
    assert(
      check.isCompliant && check.warning === undefined,
      'Wage Code 50% Rule: Passes cleanly without warning when Basic + DA is exactly 50%'
    );
  }

  // 8. Wage Code Validator: Never mutates or alters any monetary amount
  {
    const input: PayrollInput = {
      employee: { id: 'emp-wc3', code: 'WC03', name: 'Wage Code Non-Mutating', employmentType: 'monthly', doj: '2026-01-01', isActive: true },
      components: [
        { code: 'BASIC', label: 'Basic', kind: 'earning', calcType: 'fixed', amountPaise: 1000000n },
        { code: 'ALLOWANCE', label: 'Allowance', kind: 'earning', calcType: 'fixed', amountPaise: 9000000n },
      ],
      attendance: Array.from({ length: 30 }, (_, i) => ({
        workDate: `2026-04-${String(i + 1).padStart(2, '0')}`,
        status: 'P' as any,
        workedMinutes: 480,
      })),
      period: period2026,
    };

    const res = calculatePayroll(input);
    assert(
      res.grossPaise === 10000000n && res.warnings && res.warnings.length > 0,
      'Wage Code 50% Rule: Attaches compliance warning without altering calculated gross or net amounts'
    );
  }

  // 9. TDS Stub Component
  {
    const tdsLine = tds();
    assert(
      tdsLine.componentCode === 'TDS' && tdsLine.amountPaise === 0n && tdsLine.explain === 'TDS not configured',
      'TDS Stub: Returns 0 paise with explain "TDS not configured"'
    );
  }

  // 10. PT Empty Slabs
  {
    const ptRule = loadRulePack('pt', period2026, 'MH');
    const ptLines = pt({} as any, ptRule, 5000000n);
    assert(
      ptLines.length === 1 && ptLines[0].amountPaise === 0n && ptLines[0].explain.includes('TODO'),
      'Professional Tax: Returns 0 with TODO explain when slabs are empty'
    );
  }

  return { passed, failed };
}

export interface StatutoryGoldenCase {
  id: string;
  name: string;
  input: PayrollInput;
  expectedNetPaise: bigint | null;
}

export const statutoryGoldenCases: StatutoryGoldenCase[] = [
  // 1. Salaried worker with PF capped at statutory wage ceiling (₹15,000)
  {
    id: 'stat-case-1',
    name: 'Salaried worker: Basic ₹30,000 exceeds ₹15,000 PF ceiling, gross ₹40,000 exceeds ₹21,000 ESI ceiling',
    input: {
      employee: {
        id: 'emp-stat-01',
        code: 'STAT01',
        name: 'Arjun Rao',
        employmentType: 'monthly',
        doj: '2025-01-01',
        isActive: true,
        stateCode: 'MH',
      },
      components: [
        { code: 'BASIC', label: 'Basic', kind: 'earning', calcType: 'fixed', amountPaise: 3000000n }, // ₹30,000
        { code: 'HRA', label: 'HRA', kind: 'earning', calcType: 'fixed', amountPaise: 1000000n },   // ₹10,000
      ],
      attendance: Array.from({ length: 30 }, (_, i) => ({
        workDate: `2026-04-${String(i + 1).padStart(2, '0')}`,
        status: 'P' as any,
        workedMinutes: 480,
      })),
      period: { year: 2026, month: 4, daysInMonth: 30, startDate: '2026-04-01', endDate: '2026-04-30' },
      applyStatutory: true,
    },
    expectedNetPaise: TODO_EXPECTED_NET_PAISE,
  },

  // 2. Low-wage worker where both PF and ESI are applicable (Gross <= ₹21,000)
  {
    id: 'stat-case-2',
    name: 'Low-wage worker: Basic ₹10,000 (PF 12%), Total Gross ₹15,000 (ESI 0.75% applicable)',
    input: {
      employee: {
        id: 'emp-stat-02',
        code: 'STAT02',
        name: 'Manoj Kumar',
        employmentType: 'monthly',
        doj: '2025-01-01',
        isActive: true,
        stateCode: 'MH',
      },
      components: [
        { code: 'BASIC', label: 'Basic', kind: 'earning', calcType: 'fixed', amountPaise: 1000000n }, // ₹10,000
        { code: 'OTHER_ALLOWANCE', label: 'Other Allowance', kind: 'earning', calcType: 'fixed', amountPaise: 500000n }, // ₹5,000
      ],
      attendance: Array.from({ length: 30 }, (_, i) => ({
        workDate: `2026-04-${String(i + 1).padStart(2, '0')}`,
        status: 'P' as any,
        workedMinutes: 480,
      })),
      period: { year: 2026, month: 4, daysInMonth: 30, startDate: '2026-04-01', endDate: '2026-04-30' },
      applyStatutory: true,
    },
    expectedNetPaise: TODO_EXPECTED_NET_PAISE,
  },

  // 3. High-wage worker with advance deduction and statutory PF
  {
    id: 'stat-case-3',
    name: 'Executive: Gross ₹80,000, PF capped at ₹15,000 ceiling, Advance recovery ₹10,000',
    input: {
      employee: {
        id: 'emp-stat-03',
        code: 'STAT03',
        name: 'Priyanka Sen',
        employmentType: 'monthly',
        doj: '2024-01-01',
        isActive: true,
        stateCode: 'MH',
      },
      components: [
        { code: 'BASIC', label: 'Basic', kind: 'earning', calcType: 'fixed', amountPaise: 5000000n }, // ₹50,000
        { code: 'SPECIAL_ALLOWANCE', label: 'Special Allowance', kind: 'earning', calcType: 'fixed', amountPaise: 3000000n }, // ₹30,000
      ],
      attendance: Array.from({ length: 30 }, (_, i) => ({
        workDate: `2026-04-${String(i + 1).padStart(2, '0')}`,
        status: 'P' as any,
        workedMinutes: 480,
      })),
      advances: [
        { id: 'adv-stat-1', amountPaise: 5000000n, recoveryPerMonthPaise: 1000000n, balancePaise: 3000000n }, // ₹10,000 recovery
      ],
      period: { year: 2026, month: 4, daysInMonth: 30, startDate: '2026-04-01', endDate: '2026-04-30' },
      applyStatutory: true,
    },
    expectedNetPaise: TODO_EXPECTED_NET_PAISE,
  },

  // 4. Indian Code on Wages 50% threshold breach with statutory calculations
  {
    id: 'stat-case-4',
    name: 'Wage Code breach: Basic ₹15,000 + Allowances ₹45,000 (Basic is 25% < 50%)',
    input: {
      employee: {
        id: 'emp-stat-04',
        code: 'STAT04',
        name: 'Kavita Joshi',
        employmentType: 'monthly',
        doj: '2025-06-01',
        isActive: true,
        stateCode: 'MH',
      },
      components: [
        { code: 'BASIC', label: 'Basic', kind: 'earning', calcType: 'fixed', amountPaise: 1500000n }, // ₹15,000 (25%)
        { code: 'SPECIAL_ALLOWANCE', label: 'Special Allowance', kind: 'earning', calcType: 'fixed', amountPaise: 4500000n }, // ₹45,000 (75%)
      ],
      attendance: Array.from({ length: 30 }, (_, i) => ({
        workDate: `2026-04-${String(i + 1).padStart(2, '0')}`,
        status: 'P' as any,
        workedMinutes: 480,
      })),
      period: { year: 2026, month: 4, daysInMonth: 30, startDate: '2026-04-01', endDate: '2026-04-30' },
      applyStatutory: true,
    },
    expectedNetPaise: TODO_EXPECTED_NET_PAISE,
  },
];

export function runStatutoryGoldenTests(): { passed: number; failed: number } {
  console.log('\n' + '='.repeat(80));
  console.log('  STATUTORY GOLDEN TESTS (Expected values left as TODO for user verification)');
  console.log('='.repeat(80));

  let passed = 0;
  let failed = 0;

  for (const testCase of statutoryGoldenCases) {
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
      console.log('    Breakdown:');
      for (const line of result.lines) {
        console.log(`      • [${line.componentCode}] ${line.label}: ₹${formatPaise(line.amountPaise)} (${line.kind}) - ${line.explain}`);
      }
      if (result.warnings && result.warnings.length > 0) {
        for (const w of result.warnings) {
          console.log(`      ⚠️  ${w}`);
        }
      }
      failed++;
    }
  }

  return { passed, failed };
}
