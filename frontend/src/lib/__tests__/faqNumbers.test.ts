/**
 * faqNumbers.json holds the API's answers for the FAQ's households. These
 * tests check the answers belong to the households the FAQ describes, and
 * that they bear out the FAQ's words ("the same $220", "saved nothing").
 *
 * If a test fails after a model update, rerun `bun run faq-numbers` and
 * reread the FAQ: the words may need to change with the numbers.
 *
 * Invariants:
 * - Each recorded request is what the calculator sends for its case today.
 * - Each US case is a household a link reproduces (`isShareable`).
 * - Each answer's gift and year are its case's.
 * - The bunching gain is the bunched savings minus both years' savings.
 */

import { describe, it, expect } from "vitest";
import { ukApiRequest } from "../api";
import {
  UK_FAQ_CASES,
  US_BUNCHING_CASES,
  US_FAQ_CASES,
  type UKFaqCase,
  type USFaqCase,
} from "../faqCases";
import { FAQ_FIGURES } from "../faqFigures";
import numbers from "../faqNumbers.json";
import { toCalculateRequest } from "../household";
import { isShareable } from "../urlState";

const usCases = Object.keys(US_FAQ_CASES) as USFaqCase[];
const ukCases = Object.keys(UK_FAQ_CASES) as UKFaqCase[];

describe("FAQ numbers", () => {
  it("cover every case and nothing else", () => {
    expect(Object.keys(numbers.us).sort()).toEqual([...usCases].sort());
    expect(Object.keys(numbers.uk).sort()).toEqual([...ukCases].sort());
  });

  it.each(usCases)("record the request the calculator sends for %s", (name) => {
    const form = US_FAQ_CASES[name];
    expect(numbers.us[name].request).toEqual({
      ...toCalculateRequest(form),
      ...(US_BUNCHING_CASES.has(name) ? { bunching: true } : {}),
    });
    expect(isShareable(form)).toBe(true);
    const { response } = numbers.us[name];
    expect(response.donation_amount).toBe(form.donation_amount);
    expect(response.year).toBe(form.household.year);
    expect(response.tax_savings).toBeCloseTo(
      response.baseline_net_tax - response.net_tax_at_donation,
      6,
    );
  });

  it.each(ukCases)("record the request the calculator sends for %s", (name) => {
    const request = UK_FAQ_CASES[name];
    expect(numbers.uk[name].request).toEqual(ukApiRequest(request));
    const { response } = numbers.uk[name];
    expect(response.gift_aid).toBe(request.gift_aid);
    expect(response.year).toBe(request.year);
  });

  it("bear out the California answer", () => {
    const { california } = FAQ_FIGURES;
    expect(california.savings).toBeGreaterThan(0);
    // "and the same $220 by giving $5,000"
    expect(california.largerGiftSavings).toBe(california.savings);
    expect(california.largerGift).toBeGreaterThan(california.gift);
    // "In 2025, the $1,000 gift saved nothing."
    expect(california.earlierYearSavings).toBe(0);
    expect(california.earlierYear).toBe(california.year - 1);
  });

  it("bear out the bunching answer", () => {
    const bunching = numbers.us.newYork.response.bunching;
    const { newYork } = FAQ_FIGURES;
    expect(bunching.next_year).toBe(newYork.year + 1);
    expect(bunching.bunched_donation_amount).toBe(2 * newYork.gift);
    expect(newYork.bunching.gain).toBeCloseTo(bunching.bunching_gain, 6);
    expect(newYork.bunching.gain).toBeCloseTo(
      bunching.bunched_tax_savings -
        numbers.us.newYork.response.tax_savings -
        bunching.next_year_tax_savings,
      6,
    );
    // "saves $2,820 more in tax"
    expect(newYork.bunching.gain).toBeGreaterThan(0);
  });

  it("bear out the top-bracket answer", () => {
    const { texas } = FAQ_FIGURES;
    // 37% of the 35/37 of each extra dollar the 2/37 limit leaves.
    const perDollar = texas.extraSavings / (texas.largerGift - texas.gift);
    expect(perDollar).toBeCloseTo(0.37 * (35 / 37), 3);
  });

  it("bear out the Gift Aid answer", () => {
    const { giftAid } = FAQ_FIGURES;
    // "saves nothing, because the basic-rate relief goes to the charity"
    expect(giftAid.basicRateSavings).toBe(0);
    // A 40% taxpayer saves 40% - 20% of the gift grossed up at 20%.
    expect(giftAid.higherRateSavings).toBeCloseTo(
      (0.4 - 0.2) * (giftAid.gift / 0.8),
      6,
    );
  });
});
