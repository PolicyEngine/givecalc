/**
 * The cost headline and bunching sentence.
 *
 * Figures in these examples come from policyengine-us 2.49.2 and
 * policyengine-uk 2.134.6 runs (2026-10-16 GiveCalc review).
 */

import { describe, it, expect } from "vitest";
import { bunchingSentence, costHeadline } from "../Results";
import type { CalculateResponse } from "../../lib/types";

function response(gift: number, savings: number): CalculateResponse {
  return {
    donation_amount: gift,
    baseline_net_tax: 0,
    net_tax_at_donation: -savings,
    tax_savings: savings,
    marginal_savings_rate: 0,
    baseline_net_income: 0,
    net_income_after_donation: 0,
    curve: [],
  };
}

describe("costHeadline", () => {
  it("states a US pledge's cost and the share taxes cover", () => {
    const { headline, detail } = costHeadline(
      response(15_000, 1_589),
      "USD",
      2026,
      10,
    );
    expect(headline).toBe("Your 10% pledge ($15,000) costs you $13,411 in 2026.");
    expect(detail).toBe("Lower taxes cover $1,589, or 11% of the gift.");
  });

  it("says when taxes don't change", () => {
    const { headline, detail } = costHeadline(
      response(1_000, 0),
      "USD",
      2025,
    );
    expect(headline).toBe("Your $1,000 gift costs you $1,000 in 2025.");
    expect(detail).toBe("Your taxes don't change at this gift size.");
  });

  it("credits the charity, not the donor, with basic-rate relief", () => {
    const { headline, detail } = costHeadline(
      response(1_000, 0),
      "GBP",
      2026,
    );
    expect(headline).toBe(
      "Your £1,000 gift is worth £1,250 to a charity that claims Gift Aid, and costs you £1,000.",
    );
    expect(detail).toContain("relief goes to the charity");
  });

  it("shows a higher-rate donor's reclaim", () => {
    const { headline, detail } = costHeadline(
      response(2_000, 500),
      "GBP",
      2026,
    );
    expect(headline).toContain("costs you £1,500");
    expect(detail).toBe("You reclaim £500 through your tax return.");
  });
});

describe("bunchingSentence", () => {
  it("states the gain when bunching pays", () => {
    expect(
      bunchingSentence(
        { everyYearSavings: 3_033, bunchedSavings: 5_853, gain: 2_820 },
        15_000,
        2026,
      ),
    ).toBe(
      "Giving $30,000 in 2026 and nothing in 2027 saves $2,820 more in tax than giving $15,000 in each year.",
    );
  });

  it("states a small difference plainly", () => {
    expect(
      bunchingSentence(
        { everyYearSavings: 16_530, bunchedSavings: 16_531, gain: 1 },
        30_000,
        2026,
      ),
    ).toBe(
      "Giving two years' gifts in 2026 instead of $30,000 in each year changes your taxes by $1.",
    );
  });
});
