/**
 * Pledge and bunching helpers.
 *
 * A pledge is a share of income. Bunching compares giving a pledge in each
 * of two years with giving both years' pledges in the first year. Every
 * savings figure passed in here comes from its own simulation.
 */

import type { Income } from "./types";

/**
 * Income a pledge is a share of. Qualified dividends are a subset of
 * dividends, so they are not added again; this matches the income the API
 * uses for the top of its donation curve.
 */
export function pledgeBaseIncome(income: Income): number {
  return (
    income.wages_and_salaries +
    income.tips +
    income.self_employment_income +
    income.interest_income +
    income.dividends +
    income.short_term_capital_gains +
    income.long_term_capital_gains
  );
}

/** The gift a pledge of `percent` of income implies, in whole dollars. */
export function pledgeAmount(percent: number, income: Income): number {
  if (!Number.isFinite(percent) || percent <= 0) return 0;
  return Math.round((percent / 100) * pledgeBaseIncome(income));
}

export interface BunchingComparison {
  /** Tax saved by giving the gift this year and again next year. */
  everyYearSavings: number;
  /** Tax saved by giving two years' gifts this year and nothing next year. */
  bunchedSavings: number;
  /** bunchedSavings minus everyYearSavings. */
  gain: number;
}

export function compareBunching(
  thisYearSavings: number,
  nextYearSavings: number,
  bunchedSavings: number,
): BunchingComparison {
  const everyYearSavings = thisYearSavings + nextYearSavings;
  return {
    everyYearSavings,
    bunchedSavings,
    gain: bunchedSavings - everyYearSavings,
  };
}
