// src/engine/rules/types.ts
// Type definitions for external versioned statutory rule data packs

export interface RulePack<TParams = any> {
  rule: string;
  version: string;
  effective_from: string; // ISO date 'YYYY-MM-DD'
  verify_with_ca: boolean;
  state?: string;
  todo?: string;
  params: TParams;
}

export interface PFRuleParams {
  employee_rate_bps: number; // e.g. 1200 for 12.00%
  employer_rate_bps: number; // e.g. 1200 for 12.00%
  wage_ceiling_paise: number; // 1500000 paise (₹15,000)
  ceiling_applies_to: string[]; // ['BASIC', 'DA']
}

export interface ESIRuleParams {
  employee_rate_bps: number; // 75 for 0.75%
  employer_rate_bps: number; // 325 for 3.25%
  gross_ceiling_paise: number; // 2100000 paise (₹21,000)
  not_applicable_above_ceiling: boolean;
}

export interface PTSlab {
  min_gross_paise: number;
  max_gross_paise: number | null; // null for open-ended top slab
  tax_paise: number;
}

export interface PTRuleParams {
  slabs: PTSlab[];
}
