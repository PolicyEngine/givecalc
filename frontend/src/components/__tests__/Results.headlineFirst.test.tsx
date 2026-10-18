/**
 * Results shows the headline from /api/savings before the curve arrives.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import Results from "../Results";
import type { CalculateResponse, Headline } from "../../lib/types";

vi.mock("../TaxChart", () => ({
  default: () => <div data-testid="tax-chart" />,
}));
vi.mock("../MarginalChart", () => ({
  default: () => <div data-testid="marginal-chart" />,
}));

// policyengine-us 2.49.2: single, New York, $150,000 wages, $15,000 gift,
// 2026 (the 2026-10-16 GiveCalc review's pledge example).
const HEADLINE: Headline = {
  donation_amount: 15_000,
  baseline_net_tax: 44_942.11,
  net_tax_at_donation: 43_353.21,
  tax_savings: 1_588.9,
  baseline_net_income: 105_057.89,
  net_income_after_donation: 91_646.8,
};

const FULL: CalculateResponse = {
  ...HEADLINE,
  marginal_savings_rate: 0.2842,
  curve: [
    { donation: 0, net_tax: 44_942.11, marginal_savings: 0.2, net_income: 105_057.89 },
    { donation: 15_000, net_tax: 43_353.21, marginal_savings: 0.28, net_income: 91_646.8 },
  ],
};

const LOADING = "Loading the chart across donation amounts...";
const FAILED = "The chart could not load. Calculate again to retry.";

afterEach(cleanup);

describe("Results - headline before the curve", () => {
  it("shows the cost and savings while the curve loads", () => {
    render(
      <Results
        headline={HEADLINE}
        result={null}
        year={2026}
        isLoadingCurve
      />,
    );
    expect(
      screen.getByText("Your $15,000 gift costs you $13,411 in 2026."),
    ).toBeInTheDocument();
    expect(screen.getByText("$13,411")).toBeInTheDocument();
    expect(screen.getByText("$1,589")).toBeInTheDocument();
    expect(screen.getByText("…")).toBeInTheDocument();
    expect(screen.getAllByText(LOADING)).toHaveLength(2);
    expect(screen.queryByTestId("tax-chart")).not.toBeInTheDocument();
  });

  it("fills in the marginal rate and charts when the curve arrives", () => {
    render(<Results headline={HEADLINE} result={FULL} year={2026} />);
    expect(screen.getByText("$1,589")).toBeInTheDocument();
    expect(screen.getByText("28.4%")).toBeInTheDocument();
    expect(screen.getByTestId("tax-chart")).toBeInTheDocument();
    expect(screen.getByTestId("marginal-chart")).toBeInTheDocument();
  });

  it("keeps the headline and says so when the curve fails", () => {
    render(
      <Results headline={HEADLINE} result={null} year={2026} curveFailed />,
    );
    expect(screen.getByText("$1,589")).toBeInTheDocument();
    expect(screen.getAllByText(FAILED)).toHaveLength(2);
  });

  it("shows the spinner only until the headline arrives", () => {
    render(
      <Results headline={null} result={null} year={2026} isCalculating />,
    );
    expect(screen.getByText("Calculating...")).toBeInTheDocument();
  });

  it("shows UK Gift Aid figures from the headline", () => {
    render(
      <Results
        headline={{
          donation_amount: 2_000,
          baseline_net_tax: 19_022.65,
          net_tax_at_donation: 18_522.65,
          tax_savings: 500,
          baseline_net_income: 50_977.35,
          net_income_after_donation: 49_477.35,
        }}
        result={null}
        year={2026}
        isLoadingCurve
        currency="GBP"
      />,
    );
    expect(screen.getByText("£2,500")).toBeInTheDocument();
    expect(screen.getByText("£500")).toBeInTheDocument();
    expect(screen.getByText("£1,500")).toBeInTheDocument();
  });
});
