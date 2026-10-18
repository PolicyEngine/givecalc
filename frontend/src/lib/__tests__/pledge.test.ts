/**
 * Bunching comparison.
 *
 * Invariant: bunching gain = bunched savings - (this year's + next year's
 * savings). The pledge itself is tested in household.test.ts.
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { compareBunching } from "../pledge";

const money = fc.integer({ min: 0, max: 5_000_000 });

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
