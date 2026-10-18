/**
 * App: instant load, shared links, and the bunching check's extra runs.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";
import * as api from "../../lib/api";
import { CURRENT_YEAR, MAX_TAX_YEAR, type CalculateRequest } from "../../lib/types";

// Mock the API module - calculateDonation is the only US call that hits the API
vi.mock("../../lib/api", async (importOriginal) => {
  const actual = (await importOriginal()) as typeof api;
  return {
    ...actual,
    calculateDonation: vi.fn(),
  };
});

/** A stand-in API response; the numbers are test values, not model output. */
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
    const calculate = vi.mocked(api.calculateDonation);
    calculate.mockImplementation(async (request) =>
      response(request, request.donation_amount === 30_000 ? 5_853 : 1_589),
    );
    window.history.replaceState(null, "", "/?pledge=10&income=150000&state=NY");
    const App = (await import("../../App")).default;
    render(<App />);

    await waitFor(() => expect(calculate).toHaveBeenCalled());
    const [first] = calculate.mock.calls[0];
    expect(first.year).toBe(CURRENT_YEAR);
    expect(first.donation_amount).toBe(15_000);
    const year = String(CURRENT_YEAR);
    expect(first.household.people["adult-1"]).toEqual({
      age: { [year]: 30 },
      is_tax_unit_dependent: { [year]: false },
      employment_income: { [year]: 150_000 },
    });
    expect(first.household.households?.household.state_name).toEqual({ [year]: "NY" });

    if (CURRENT_YEAR + 1 <= MAX_TAX_YEAR) {
      await waitFor(() => expect(calculate).toHaveBeenCalledTimes(3));
      const requests = calculate.mock.calls.map(([request]) => request);
      const nextYear = requests.find((request) => request.year === CURRENT_YEAR + 1);
      // Next year's run moves the whole household a year on, everyone a
      // year older, with the same gift.
      expect(nextYear?.donation_amount).toBe(15_000);
      expect(nextYear?.household.people["adult-1"].age).toEqual({
        [String(CURRENT_YEAR + 1)]: 31,
      });
      const bunched = requests.find((request) => request.donation_amount === 30_000);
      expect(bunched?.year).toBe(CURRENT_YEAR);
    }

    await waitFor(() =>
      expect(window.location.search).toBe(
        `?pledge=10&income=150000&state=NY&age=30&year=${CURRENT_YEAR}`,
      ),
    );
    expect(screen.getByRole("heading", { name: "Review and calculate" })).toBeInTheDocument();
  });

  it("drops the link after a result the link cannot reproduce, and restores cached results", async () => {
    const calculate = vi.mocked(api.calculateDonation);
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
    const calls = calculate.mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: /Edit Household income/ }));
    fireEvent.change(screen.getByLabelText("Taxable interest"), { target: { value: "" } });
    expect(screen.getByText(/Your net cost/)).toBeInTheDocument();
    expect(calculate.mock.calls.length).toBe(calls);
    expect(window.location.search).toBe(
      `?amount=5000&income=150000&state=NY&age=30&year=${CURRENT_YEAR}`,
    );
  });

  it("fills an incomplete link without calculating, on the question it leaves open", async () => {
    const calculate = vi.mocked(api.calculateDonation);
    window.history.replaceState(null, "", "/?pledge=10&income=90000&state=MD");
    const App = (await import("../../App")).default;
    render(<App />);
    expect(await screen.findByRole("heading", { name: "Your household" })).toBeInTheDocument();
    expect(screen.getByLabelText("State")).toHaveValue("MD");
    expect(calculate).not.toHaveBeenCalled();
  });

  it("uses hardcoded STATES constant directly", () => {
    expect(api.STATES.states.length).toBeGreaterThan(50); // All US states + DC
    const california = api.STATES.states.find((s) => s.code === "CA");
    expect(california?.name).toBe("California");
    expect(california?.has_special_programs).toBeDefined();
  });
});
