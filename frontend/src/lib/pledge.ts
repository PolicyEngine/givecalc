/**
 * Bunching compares giving a gift in each of two years with giving both
 * years' gifts in the first year. Every savings figure passed in here comes
 * from its own simulation. The pledge itself is `giftAmount` in household.ts.
 */

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
