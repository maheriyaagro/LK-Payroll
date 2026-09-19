// src/engine/validators.ts
// Compliance validators for statutory and labor regulations

import { PayrollInput } from './types';
import { formatPaise } from './components';

export interface WageCodeCheckResult {
  isCompliant: boolean;
  basicAndDaPaise: bigint;
  totalRemunerationPaise: bigint;
  warning?: string;
}

/**
 * wageCodeCheck(input):
 * Checks compliance with the Indian Code on Wages (Section 2(y)) 50% rule:
 * Basic + Dearness Allowance (DA) must constitute at least 50% of total employee remuneration.
 *
 * CRITICAL RULE:
 * This function returns a WARNING only. It NEVER alters or mutates any monetary amounts.
 */
export function wageCodeCheck(input: PayrollInput): WageCodeCheckResult {
  let basicAndDaPaise = 0n;
  let totalRemunerationPaise = 0n;

  for (const comp of input.components) {
    if (comp.kind === 'earning') {
      totalRemunerationPaise += comp.amountPaise;
      const code = comp.code.toUpperCase();
      if (code === 'BASIC' || code === 'DA') {
        basicAndDaPaise += comp.amountPaise;
      }
    }
  }

  // If there are zero earnings, consider it compliant without warning
  if (totalRemunerationPaise <= 0n) {
    return {
      isCompliant: true,
      basicAndDaPaise: 0n,
      totalRemunerationPaise: 0n,
    };
  }

  // 50% threshold check: basicAndDaPaise * 2n >= totalRemunerationPaise
  const isCompliant = basicAndDaPaise * 2n >= totalRemunerationPaise;

  let warning: string | undefined = undefined;
  if (!isCompliant) {
    warning =
      `Indian Code on Wages warning: Basic + DA (₹${formatPaise(basicAndDaPaise)}) ` +
      `is below 50% of total remuneration (₹${formatPaise(totalRemunerationPaise)}). ` +
      `Under Section 2(y), excess allowances may be deemed wages for statutory purposes.`;
  }

  return {
    isCompliant,
    basicAndDaPaise,
    totalRemunerationPaise,
    warning,
  };
}
