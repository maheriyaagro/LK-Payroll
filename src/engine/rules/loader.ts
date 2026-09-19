// src/engine/rules/loader.ts
// Pure rule loader for versioned statutory rules
// Strictly deterministic: finds the latest rule pack whose effective_from <= period.startDate.
// Throws explicit error if no pack exists. Never falls back silently.

import { Period } from '../types';
import { RulePack } from './types';

import pfJson from './in/pf.json';
import esiJson from './in/esi.json';
import ptMhJson from './in/pt-mh.json';

// Built-in rule pack repository
export const BUILTIN_RULE_PACKS: RulePack[] = [
  pfJson as unknown as RulePack,
  esiJson as unknown as RulePack,
  ptMhJson as unknown as RulePack,
];

/**
 * loadRulePack(ruleName, period, state, customPacks):
 *
 * Finds the latest rule pack for a given rule (and optional state)
 * whose effective_from is on or before period.startDate.
 *
 * @throws Error if no matching pack exists. Never falls back silently.
 */
export function loadRulePack<T = any>(
  rule: string,
  period: Period,
  state?: string,
  customPacks?: RulePack[]
): RulePack<T> {
  const packs = customPacks ?? BUILTIN_RULE_PACKS;
  const normalizedRule = rule.trim().toLowerCase();
  const normalizedState = state ? state.trim().toUpperCase() : undefined;
  const periodStart = period.startDate;

  // Filter packs matching rule and state
  const matchingPacks = packs.filter((p) => {
    if (p.rule.toLowerCase() !== normalizedRule) return false;
    if (normalizedState) {
      if (p.state && p.state.toUpperCase() !== normalizedState) return false;
    }
    return true;
  });

  if (matchingPacks.length === 0) {
    const stateStr = normalizedState ? ` (state: ${normalizedState})` : '';
    throw new Error(
      `No rule pack registered for rule "${rule}"${stateStr}.`
    );
  }

  // Filter packs effective on or before the period start date
  const eligiblePacks = matchingPacks.filter(
    (p) => p.effective_from <= periodStart
  );

  if (eligiblePacks.length === 0) {
    const availableDates = matchingPacks
      .map((p) => `v${p.version} (effective ${p.effective_from})`)
      .join(', ');
    throw new Error(
      `No rule pack found for rule "${rule}" effective on or before period start date "${periodStart}". ` +
        `Available versions: [${availableDates}]. Silent fallbacks are strictly prohibited.`
    );
  }

  // Sort by effective_from descending, and then version descending for deterministic tie-breaking
  eligiblePacks.sort((a, b) => {
    if (a.effective_from !== b.effective_from) {
      return a.effective_from > b.effective_from ? -1 : 1;
    }
    return a.version > b.version ? -1 : 1;
  });

  return eligiblePacks[0] as RulePack<T>;
}
