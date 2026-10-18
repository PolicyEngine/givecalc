/**
 * App: instant load, shared links, and the bunching check's extra runs.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";
import * as api from "../../lib/api";
import {
  CURRENT_YEAR,
  MAX_TAX_YEAR,
  type CalculateRequest,
  type SavingsRequest,
} from "../../lib/types";

// The US calls that hit the API: /api/savings for the headline and the
// bunching check, /api/calculate for the curve.
vi.mock("../../lib/api", async (importOriginal) => {
  const actual = (await importOriginal()) as typeof api;
  return {
    ...actual,
    calculateSavings: vi.fn(),
    calculateDonation: vi.fn(),
  };
});

/** Stand-in API responses; the numbers are test values, not model output. */
function headline(request: SavingsRequest, taxSavings: number) {
  return {
    year: request.year,
    donation_amount: request.donation_amount,
    baseline_net_tax: 40_000,
    net_tax_at_donation: 40_000 - taxSavings,
    tax_savings: taxSavings,
    baseline_net_income: 110_000,
    net_income_after_donation: 110_000 - request.donation_amount + taxSavings,
    bunching: null,
  };
}

function response(request: CalculateRequest, taxSavings: number) {
  return {
    donation_amount: request.donation_amount,
    baseline_net_tax: 40_000,
    net_tax_at_donation: 40_000 - taxSavings,
    tax_savings: taxSavings,
    marginal_savings_rate: 0.3,
    baseline_net_income: 110_000,
    net_income_after_donation: 110_000 - request.donation_amount + taxSavings,
    curve: [
      { donation: 0, net_tax: 40_000, marginal_savings: 0.3, net_income: 110_000 },
      {
        donation: request.donation_amount,
        net_tax: 40_000 - taxSavings,
        marginal_savings: 0.3,
        net_income: 110_000 - request.donation_amount + taxSavings,
      },
    ],
  };
}

// jsdom has no ResizeObserver, which the results charts use.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe("App", () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", ResizeObserverStub);
    vi.clearAllMocks();
    vi.resetModules();
    window.history.replaceState(null, "", "/");
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the first question without a loading spinner", async () => {
    const App = (await import("../../App")).default;
    render(<App />);
    expect(document.querySelector(".animate-spin")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Your gift" })).toBeInTheDocument();
  });

  it("calculates a shared link, runs the bunching check, and keeps the link", async () => {
    const savings = vi.mocked(api.calculateSavings);
    const calculate = vi.mocked(api.calculateDonation);
    savings.mockImplementation(async (request) => ({
      ...headline(request, 1_589),
      bunching: request.bunching
        ? {
            next_year: request.year + 1,
            next_year_baseline_net_tax: 40_000,
            next_year_net_tax_at_donation: 38_411,
            next_year_tax_savings: 1_589,
            bunched_donation_amount: 2 * request.donation_amount,
            bunched_net_tax: 34_147,
            bunched_tax_savings: 5_853,
            every_year_tax_savings: 3_178,
            bunching_gain: 2_675,
          }
        : null,
    }));
    calculate.mockImplementation(async (request) => response(request, 1_589));
    window.history.replaceState(null, "", "/?pledge=10&income=150000&state=NY");
    const App = (await import("../../App")).default;
    render(<App />);

    await waitFor(() => expect(savings).toHaveBeenCalled());
    const [first] = savings.mock.calls[0];
    expect(first.bunching).toBeFalsy();
    expect(first.year).toBe(CURRENT_YEAR);
    expect(first.donation_amount).toBe(15_000);
    const year = String(CURRENT_YEAR);
    expect(first.household.people["adult-1"]).toEqual({
      age: { [year]: 30 },
      is_tax_unit_dependent: { [year]: false },
      employment_income: { [year]: 150_000 },
    });
    expect(first.household.households?.household.state_name).toEqual({ [year]: "NY" });

    // The form offers last, this and next year, so next year is always open.
    expect(CURRENT_YEAR + 1).toBeLessThanOrEqual(MAX_TAX_YEAR);
    // The curve is the same request; the bunching check is one more
    // /api/savings call, which moves and ages the household on the server
    // (tests/test_savings_wizard.py).
    await waitFor(() => expect(savings).toHaveBeenCalledTimes(2));
    expect(calculate).toHaveBeenCalledWith(first);
    expect(savings.mock.calls[1][0]).toEqual({ ...first, bunching: true });
    expect(await screen.findByText(/\$2,675/)).toBeInTheDocument();

    await waitFor(() =>
      expect(window.location.search).toBe(
        `?pledge=10&income=150000&state=NY&age=30&year=${CURRENT_YEAR}`,
      ),
    );
    expect(screen.getByRole("heading", { name: "Review and calculate" })).toBeInTheDocument();
  });

  it("drops the link after a result the link cannot reproduce, and restores cached results", async () => {
    const savings = vi.mocked(api.calculateSavings);
    const calculate = vi.mocked(api.calculateDonation);
    savings.mockImplementation(async (request) => headline(request, 1_000));
    calculate.mockImplementation(async (request) => response(request, 1_000));
    window.history.replaceState(null, "", "/?amount=5000&income=150000&state=NY");
    const App = (await import("../../App")).default;
    render(<App />);
    await waitFor(() => expect(window.location.search).toContain("amount=5000"));
    await screen.findByText(/Your net cost/);

    // Add interest income, which a link does not carry, and recalculate.
    fireEvent.click(screen.getByRole("button", { name: /Edit Household income/ }));
    expect(screen.queryByText(/Your net cost/)).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: /Tips, self-employment and investment income/ }),
    );
    fireEvent.change(screen.getByLabelText("Taxable interest"), { target: { value: "20000" } });
    // The result no longer matches the form.
    expect(screen.queryByText(/Your net cost/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: "Calculate tax impact" }));
    await screen.findByText(/Your net cost/);
    expect(window.location.search).toBe("");

    // Undoing the edit brings back the cached result, and its link, without
    // a new request.
    const calls = savings.mock.calls.length + calculate.mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: /Edit Household income/ }));
    fireEvent.change(screen.getByLabelText("Taxable interest"), { target: { value: "" } });
    expect(screen.getByText(/Your net cost/)).toBeInTheDocument();
    expect(savings.mock.calls.length + calculate.mock.calls.length).toBe(calls);
    expect(window.location.search).toBe(
      `?amount=5000&income=150000&state=NY&age=30&year=${CURRENT_YEAR}`,
    );
  });

  it("keeps the user's place when they switch country and back", async () => {
    const App = (await import("../../App")).default;
    render(<App />);
    fireEvent.change(screen.getByLabelText("How much do you plan to give?"), {
      target: { value: "5000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.change(screen.getByLabelText("State"), { target: { value: "NY" } });
    fireEvent.click(screen.getByRole("button", { name: "United Kingdom" }));
    fireEvent.click(screen.getByRole("button", { name: "United States" }));
    expect(screen.getByRole("heading", { name: "Your household" })).toBeInTheDocument();
    expect(screen.getByLabelText("State")).toHaveValue("NY");
  });

  it("fills an incomplete link without calculating, on the question it leaves open", async () => {
    const savings = vi.mocked(api.calculateSavings);
    const calculate = vi.mocked(api.calculateDonation);
    window.history.replaceState(null, "", "/?pledge=10&income=90000&state=MD");
    const App = (await import("../../App")).default;
    render(<App />);
    expect(await screen.findByRole("heading", { name: "Your household" })).toBeInTheDocument();
    expect(screen.getByLabelText("State")).toHaveValue("MD");
    expect(savings).not.toHaveBeenCalled();
    expect(calculate).not.toHaveBeenCalled();
  });

  it("uses hardcoded STATES constant directly", () => {
    expect(api.STATES.states.length).toBeGreaterThan(50); // All US states + DC
    const california = api.STATES.states.find((s) => s.code === "CA");
    expect(california?.name).toBe("California");
    expect(california?.has_special_programs).toBeDefined();
  });
});
