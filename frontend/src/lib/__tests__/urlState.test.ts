/**
 * Shareable URL state.
 *
 * Invariants:
 * - Round trip: for any shareable form, applying its own URL to the empty
 *   form gives back the same inputs.
 * - Invalid values never change the form.
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  applySearchParams,
  isReadyToCalculate,
  MAX_WAGES,
  toSearchParams,
} from "../urlState";
import { DEFAULT_FORM_STATE, TAX_YEAR_OPTIONS, type FormState } from "../types";

describe("applySearchParams", () => {
  it("fills a pledge link", () => {
    const form = applySearchParams(
      DEFAULT_FORM_STATE,
      "?pledge=10&income=150000&state=ny",
    );
    expect(form.mode).toBe("pledge");
    expect(form.pledge_percent).toBe(10);
    expect(form.income.wages_and_salaries).toBe(150_000);
    expect(form.state_code).toBe("NY");
    expect(isReadyToCalculate(form)).toBe(true);
  });

  it("ignores invalid values", () => {
    const form = applySearchParams(
      DEFAULT_FORM_STATE,
      "?pledge=-3&amount=abc&income=-1&state=ZZ&married=maybe&year=1999&children=99",
    );
    expect(form).toEqual(DEFAULT_FORM_STATE);
    expect(isReadyToCalculate(form)).toBe(false);
  });

  it("caps wages at the API's $10 million limit", () => {
    expect(
      applySearchParams(DEFAULT_FORM_STATE, `?income=${MAX_WAGES}`).income
        .wages_and_salaries,
    ).toBe(MAX_WAGES);
    expect(
      applySearchParams(DEFAULT_FORM_STATE, `?income=${MAX_WAGES + 1}`).income
        .wages_and_salaries,
    ).toBe(DEFAULT_FORM_STATE.income.wages_and_salaries);
  });

  it("only sets NYC for New York", () => {
    expect(
      applySearchParams(DEFAULT_FORM_STATE, "?state=CA&nyc=1").in_nyc,
    ).toBe(false);
    expect(
      applySearchParams(DEFAULT_FORM_STATE, "?state=NY&nyc=1").in_nyc,
    ).toBe(true);
  });
});

const shareableForm: fc.Arbitrary<FormState> = fc
  .record({
    pledge: fc.boolean(),
    pledge_percent: fc.integer({ min: 1, max: 100 }),
    donation_amount: fc.integer({ min: 1, max: 1_000_000 }),
    wages: fc.integer({ min: 1, max: MAX_WAGES }),
    state_code: fc.constantFrom("CA", "NY", "TX", "MA", "DC"),
    is_married: fc.boolean(),
    in_nyc: fc.boolean(),
    num_children: fc.integer({ min: 0, max: 10 }),
    year: fc.constantFrom(...TAX_YEAR_OPTIONS),
    mortgage: fc.integer({ min: 0, max: 100_000 }),
    property_tax: fc.integer({ min: 0, max: 100_000 }),
  })
  .map((r) => ({
    ...DEFAULT_FORM_STATE,
    mode: r.pledge ? ("pledge" as const) : ("amount" as const),
    pledge_percent: r.pledge ? r.pledge_percent : DEFAULT_FORM_STATE.pledge_percent,
    donation_amount: r.pledge ? DEFAULT_FORM_STATE.donation_amount : r.donation_amount,
    income: { ...DEFAULT_FORM_STATE.income, wages_and_salaries: r.wages },
    state_code: r.state_code,
    is_married: r.is_married,
    in_nyc: r.in_nyc && r.state_code === "NY",
    num_children: r.num_children,
    year: r.year,
    deductions: {
      ...DEFAULT_FORM_STATE.deductions,
      mortgage_interest: r.mortgage,
      real_estate_taxes: r.property_tax,
    },
  }));

describe("toSearchParams", () => {
  it("round-trips every shareable form", () => {
    fc.assert(
      fc.property(shareableForm, (form) => {
        const back = applySearchParams(
          DEFAULT_FORM_STATE,
          `?${toSearchParams(form)}`,
        );
        expect(back).toEqual(form);
        expect(isReadyToCalculate(back)).toBe(true);
      }),
    );
  });
});
