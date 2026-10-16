/**
 * Pledge and bunching helpers.
 *
 * Invariants:
 * - A pledge is never negative, is zero at 0%, never exceeds income at 100%,
 *   and never falls as the percentage rises.
 * - Qualified dividends are part of dividends and do not raise the base.
 * - Bunching gain = bunched savings - (this year's + next year's savings).
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { compareBunching, pledgeAmount, pledgeBaseIncome } from "../pledge";
import { DEFAULT_INCOME, type Income } from "../types";

const money = fc.integer({ min: 0, max: 5_000_000 });
const incomeArb: fc.Arbitrary<Income> = fc.record({
  wages_and_salaries: money,
  tips: money,
  dividends: money,
  qualified_dividends: money,
  short_term_capital_gains: money,
  long_term_capital_gains: money,
  interest_income: money,
  self_employment_income: money,
});

describe("pledgeBaseIncome", () => {
  it("does not count qualified dividends twice", () => {
    expect(
      pledgeBaseIncome({
        ...DEFAULT_INCOME,
        wages_and_salaries: 100_000,
        dividends: 10_000,
        qualified_dividends: 8_000,
      }),
    ).toBe(110_000);
  });

  it("ignores qualified dividends for every income", () => {
    fc.assert(
      fc.property(incomeArb, money, (income, extra) => {
        expect(
          pledgeBaseIncome({ ...income, qualified_dividends: extra }),
        ).toBe(pledgeBaseIncome({ ...income, qualified_dividends: 0 }));
      }),
    );
  });
});

describe("pledgeAmount", () => {
  it("gives 10% of $150,000 as $15,000", () => {
    expect(
      pledgeAmount(10, { ...DEFAULT_INCOME, wages_and_salaries: 150_000 }),
    ).toBe(15_000);
  });

  it("returns 0 for non-positive or non-finite percentages", () => {
    const income = { ...DEFAULT_INCOME, wages_and_salaries: 50_000 };
    expect(pledgeAmount(0, income)).toBe(0);
    expect(pledgeAmount(-5, income)).toBe(0);
    expect(pledgeAmount(Number.NaN, income)).toBe(0);
  });

  it("stays between zero and income, and rises with the percentage", () => {
    fc.assert(
      fc.property(
        incomeArb,
        fc.double({ min: 0, max: 100, noNaN: true }),
        fc.double({ min: 0, max: 100, noNaN: true }),
        (income, a, b) => {
          const [lo, hi] = a <= b ? [a, b] : [b, a];
          const base = pledgeBaseIncome(income);
          const small = pledgeAmount(lo, income);
          const large = pledgeAmount(hi, income);
          expect(small).toBeGreaterThanOrEqual(0);
          expect(large).toBeLessThanOrEqual(Math.round(base));
          expect(large).toBeGreaterThanOrEqual(small);
        },
      ),
    );
  });
});

describe("compareBunching", () => {
  it("reports the New York example", () => {
    // Single, New York, $150,000, 10% pledge, policyengine-us 2.49.2.
    expect(compareBunching(1589, 1444, 5853)).toEqual({
      everyYearSavings: 3033,
      bunchedSavings: 5853,
      gain: 2820,
    });
  });

  it("satisfies gain = bunched - (this year + next year)", () => {
    fc.assert(
      fc.property(money, money, money, (a, b, c) => {
        const r = compareBunching(a, b, c);
        expect(r.gain).toBe(c - (a + b));
        expect(r.everyYearSavings).toBe(a + b);
      }),
    );
  });
});
