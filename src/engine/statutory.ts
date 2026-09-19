// src/engine/statutory.ts
// Pure statutory component calculation functions for Indian regulatory compliance (PF, ESI, PT, TDS stub)
// Strictly pure TypeScript. Zero floating-point arithmetic. All rounding via roundPaise().

import { PayrollInput, PayrollLine } from './types';
import { RulePack, PFRuleParams, ESIRuleParams, PTRuleParams } from './rules/types';
import { roundPaise, formatPaise } from './components';

/**
 * pf(input, rulePack, earningsLines?):
 * Pure evaluation of Provident Fund (PF) for employee deduction and employer contribution.
 *
 * Rules:
 * - Base wage = sum of earnings in params.ceiling_applies_to (e.g. ['BASIC', 'DA']).
 * - Wage ceiling: 1,500,000 paise (₹15,000.00). If base wage exceeds ceiling, base is capped at ceiling.
 * - Employee rate: 12% (1200 bps). Employer rate: 12% (1200 bps).
 */
export function pf(
  input: PayrollInput,
  rulePack: RulePack<PFRuleParams>,
  earningsLines?: PayrollLine[]
): PayrollLine[] {
  const { params } = rulePack;
  const ceilingAppliesTo = new Set(params.ceiling_applies_to.map((c) => c.toUpperCase()));
  const ceilingPaise = BigInt(params.wage_ceiling_paise);
  const employeeRateBps = BigInt(params.employee_rate_bps);
  const employerRateBps = BigInt(params.employer_rate_bps);

  // 1. Calculate eligible base wage for PF
  let baseWagePaise = 0n;

  if (earningsLines && earningsLines.length > 0) {
    for (const line of earningsLines) {
      if (line.kind === 'earning' && ceilingAppliesTo.has(line.componentCode.toUpperCase())) {
        baseWagePaise += line.amountPaise;
      }
    }
  } else {
    for (const comp of input.components) {
      if (comp.kind === 'earning' && ceilingAppliesTo.has(comp.code.toUpperCase())) {
        baseWagePaise += comp.amountPaise;
      }
    }
  }

  // 2. Apply statutory wage ceiling
  const isCapped = baseWagePaise > ceilingPaise;
  const eligibleWagePaise = isCapped ? ceilingPaise : baseWagePaise;

  // 3. Compute employee and employer shares using commercial half-up integer rounding
  const employeeContributionPaise = roundPaise(
    eligibleWagePaise * employeeRateBps,
    10000n
  );
  const employerContributionPaise = roundPaise(
    eligibleWagePaise * employerRateBps,
    10000n
  );

  // 4. Build transparent audit explanations
  const ceilingNote = isCapped
    ? ` (actual wage ₹${formatPaise(baseWagePaise)} capped at statutory ceiling ₹${formatPaise(ceilingPaise)})`
    : '';

  const eeExplain =
    `PF employee deduction (${params.employee_rate_bps / 100}%): ` +
    `₹${formatPaise(employeeContributionPaise)} calculated on base wage ₹${formatPaise(eligibleWagePaise)}${ceilingNote}.`;

  const erExplain =
    `PF employer contribution (${params.employer_rate_bps / 100}%): ` +
    `₹${formatPaise(employerContributionPaise)} calculated on base wage ₹${formatPaise(eligibleWagePaise)}${ceilingNote}.`;

  return [
    {
      componentCode: 'PF_EE',
      label: 'Provident Fund (Employee)',
      kind: 'deduction',
      amountPaise: employeeContributionPaise,
      explain: eeExplain,
    },
    {
      componentCode: 'PF_ER',
      label: 'Provident Fund (Employer)',
      kind: 'employer_cost',
      amountPaise: employerContributionPaise,
      explain: erExplain,
    },
  ];
}

/**
 * esi(input, rulePack, grossPaise?):
 * Pure evaluation of Employee State Insurance (ESI).
 *
 * Rules:
 * - Gross ceiling: 2,100,000 paise (₹21,000.00).
 * - Not applicable above ceiling: if gross exceeds ceiling, contribution is 0 paise.
 * - Employee rate: 0.75% (75 bps). Employer rate: 3.25% (325 bps).
 */
export function esi(
  input: PayrollInput,
  rulePack: RulePack<ESIRuleParams>,
  grossPaise?: bigint
): PayrollLine[] {
  const { params } = rulePack;
  const ceilingPaise = BigInt(params.gross_ceiling_paise);
  const employeeRateBps = BigInt(params.employee_rate_bps);
  const employerRateBps = BigInt(params.employer_rate_bps);

  // Determine gross paise if not supplied directly
  let totalGross = grossPaise;
  if (totalGross === undefined) {
    totalGross = 0n;
    for (const comp of input.components) {
      if (comp.kind === 'earning') {
        totalGross += comp.amountPaise;
      }
    }
  }

  // Check ceiling applicability
  if (params.not_applicable_above_ceiling && totalGross > ceilingPaise) {
    const naExplain =
      `ESI not applicable: Gross earnings ₹${formatPaise(totalGross)} ` +
      `exceed statutory ceiling of ₹${formatPaise(ceilingPaise)}.`;

    return [
      {
        componentCode: 'ESI_EE',
        label: 'Employee State Insurance (Employee)',
        kind: 'deduction',
        amountPaise: 0n,
        explain: naExplain,
      },
      {
        componentCode: 'ESI_ER',
        label: 'Employee State Insurance (Employer)',
        kind: 'employer_cost',
        amountPaise: 0n,
        explain: naExplain,
      },
    ];
  }

  // Calculate contributions
  const employeeContributionPaise = roundPaise(
    totalGross * employeeRateBps,
    10000n
  );
  const employerContributionPaise = roundPaise(
    totalGross * employerRateBps,
    10000n
  );

  const eeExplain =
    `ESI employee deduction (0.75%): ₹${formatPaise(employeeContributionPaise)} ` +
    `on gross earnings ₹${formatPaise(totalGross)}.`;

  const erExplain =
    `ESI employer contribution (3.25%): ₹${formatPaise(employerContributionPaise)} ` +
    `on gross earnings ₹${formatPaise(totalGross)}.`;

  return [
    {
      componentCode: 'ESI_EE',
      label: 'Employee State Insurance (Employee)',
      kind: 'deduction',
      amountPaise: employeeContributionPaise,
      explain: eeExplain,
    },
    {
      componentCode: 'ESI_ER',
      label: 'Employee State Insurance (Employer)',
      kind: 'employer_cost',
      amountPaise: employerContributionPaise,
      explain: erExplain,
    },
  ];
}

/**
 * pt(input, rulePack, grossPaise?):
 * Pure evaluation of Professional Tax (PT).
 *
 * Rules:
 * - Evaluates slabs from rule pack.
 * - If slabs are empty (TODO placeholder), returns 0 with explanatory note.
 */
export function pt(
  input: PayrollInput,
  rulePack: RulePack<PTRuleParams>,
  grossPaise?: bigint
): PayrollLine[] {
  const { params } = rulePack;

  if (!params.slabs || params.slabs.length === 0) {
    return [
      {
        componentCode: 'PT',
        label: 'Professional Tax',
        kind: 'deduction',
        amountPaise: 0n,
        explain: 'Professional Tax: Slabs pending configuration (TODO)',
      },
    ];
  }

  let totalGross = grossPaise;
  if (totalGross === undefined) {
    totalGross = 0n;
    for (const comp of input.components) {
      if (comp.kind === 'earning') {
        totalGross += comp.amountPaise;
      }
    }
  }

  // Match slab
  let taxPaise = 0n;
  let matchedSlabDesc = 'No matching slab found';

  for (const slab of params.slabs) {
    const min = BigInt(slab.min_gross_paise);
    const max = slab.max_gross_paise !== null ? BigInt(slab.max_gross_paise) : null;

    if (totalGross >= min && (max === null || totalGross <= max)) {
      taxPaise = BigInt(slab.tax_paise);
      matchedSlabDesc = `gross ₹${formatPaise(totalGross)} in slab [₹${formatPaise(min)} - ${max !== null ? '₹' + formatPaise(max) : 'Above'}]`;
      break;
    }
  }

  return [
    {
      componentCode: 'PT',
      label: 'Professional Tax',
      kind: 'deduction',
      amountPaise: taxPaise,
      explain: `Professional Tax: ₹${formatPaise(taxPaise)} based on ${matchedSlabDesc}.`,
    },
  ];
}

/**
 * tds(input?):
 * Stub component returning 0 with explain "TDS not configured".
 */
export function tds(input?: PayrollInput): PayrollLine {
  return {
    componentCode: 'TDS',
    label: 'Tax Deducted at Source',
    kind: 'deduction',
    amountPaise: 0n,
    explain: 'TDS not configured',
  };
}

// Named aliases for compatibility
export const calculatePF = pf;
export const calculateESI = esi;
export const calculatePT = pt;
export const calculateTDS = tds;
