/**
 * Result publishing and shareable URLs (review of #86, 2026-10-17).
 *
 * - A response that arrives after the inputs changed must not appear under
 *   the new inputs.
 * - Restoring a cached result must point the URL at that result's inputs.
 *
 * Ported to the household wizard form in #88.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import type { SavingsRequest, SavingsResponse } from "../../lib/types";

// Recharts' ResponsiveContainer needs ResizeObserver, which jsdom lacks.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

// The headline and the bunching check come from /api/savings.
const calls: {
  request: SavingsRequest;
  resolve: (r: SavingsResponse) => void;
}[] = [];

vi.mock("../../lib/api", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    calculateSavings: vi.fn(
      (request: SavingsRequest) =>
        new Promise<SavingsResponse>((resolve) => {
          calls.push({ request, resolve });
        }),
    ),
    // The curve follows the headline; these tests leave it loading.
    calculateDonation: vi.fn(() => new Promise(() => {})),
  };
});

function response(gift: number, savings: number): SavingsResponse {
  return {
    year: 2026,
    donation_amount: gift,
    baseline_net_tax: 0,
    net_tax_at_donation: -savings,
    tax_savings: savings,
    baseline_net_income: 0,
    net_income_after_donation: 0,
    bunching: null,
  };
}

/** Resolve the main calculation; bunching calls stay pending. */
async function resolveMain(index: number, savings: number) {
  const call = calls[index];
  await act(async () => {
    call.resolve(response(call.request.donation_amount, savings));
  });
}

/** Wages of the first adult in a request. */
function wages(request: SavingsRequest): number | undefined {
  const values = request.household.people["adult-1"]?.employment_income;
  return values ? Number(values[String(request.year)]) : undefined;
}

describe("App result publishing", () => {
  beforeEach(() => {
    calls.length = 0;
    vi.resetModules();
  });

  afterEach(() => {
    cleanup();
    window.history.replaceState(null, "", "/");
  });

  it("drops a response that arrives after the inputs changed", async () => {
    window.history.replaceState(
      null,
      "",
      "/?pledge=10&income=150000&state=NY&year=2026",
    );
    const App = (await import("../../App")).default;
    render(<App />);
    await waitFor(() => expect(calls.length).toBe(1));
    expect(calls[0].request.donation_amount).toBe(15_000);

    // Change the share while the first calculation is still running.
    fireEvent.click(screen.getByRole("button", { name: /Edit Gift/ }));
    fireEvent.change(
      screen.getByLabelText("What share of your income do you give?"),
      { target: { value: "20" } },
    );

    await resolveMain(0, 1_589);

    await waitFor(() =>
      expect(
        screen.getByText("What does your gift really cost?"),
      ).toBeInTheDocument(),
    );
    expect(
      screen.queryByText(/^Giving \d+% of your income/),
    ).not.toBeInTheDocument();
  });

  it("labels a result with the current inputs after an equivalent edit", async () => {
    window.history.replaceState(
      null,
      "",
      "/?pledge=10&income=160000&state=NY&year=2026",
    );
    const App = (await import("../../App")).default;
    render(<App />);
    await waitFor(() => expect(calls.length).toBe(1));

    // Rewrite 10% of $160,000 as a $16,000 amount while it calculates.
    fireEvent.click(screen.getByRole("button", { name: /Edit Gift/ }));
    fireEvent.click(screen.getByRole("radio", { name: "Specific amount" }));
    fireEvent.change(screen.getByLabelText("How much do you plan to give?"), {
      target: { value: "16000" },
    });

    await resolveMain(0, 1_600);
    await waitFor(() =>
      expect(
        screen.getByText("Your $16,000 gift costs you $14,400 in 2026."),
      ).toBeInTheDocument(),
    );
    expect(window.location.search).toContain("amount=16000");
    expect(window.location.search).not.toContain("pledge=");
  });

  it("points the URL at a restored cached result", async () => {
    window.history.replaceState(
      null,
      "",
      "/?pledge=10&income=100000&state=CA&year=2026",
    );
    const App = (await import("../../App")).default;
    render(<App />);
    await waitFor(() => expect(calls.length).toBe(1));
    await resolveMain(0, 500);
    await waitFor(() =>
      expect(
        screen.getByText(
          "Giving 10% of your income ($10,000) costs you $9,500 in 2026.",
        ),
      ).toBeInTheDocument(),
    );

    // Recalculate at $200,000.
    const editIncome = () =>
      fireEvent.click(screen.getByRole("button", { name: /Edit Household income/ }));
    const setWages = (value: string) =>
      fireEvent.change(
        screen.getByLabelText("Wages and salaries, not counting tips"),
        { target: { value } },
      );
    editIncome();
    setWages("200000");
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: "Calculate tax impact" }));
    await waitFor(() =>
      expect(calls.some((c) => wages(c.request) === 200_000)).toBe(true),
    );
    const second = calls.findIndex(
      (c) =>
        !c.request.bunching &&
        wages(c.request) === 200_000 &&
        c.request.year === 2026 &&
        c.request.donation_amount === 20_000,
    );
    await resolveMain(second, 2_000);
    await waitFor(() =>
      expect(window.location.search).toContain("income=200000"),
    );

    // Back to $100,000: the cached result returns and the URL follows it.
    editIncome();
    setWages("100000");
    expect(
      screen.getByText(
        "Giving 10% of your income ($10,000) costs you $9,500 in 2026.",
      ),
    ).toBeInTheDocument();
    expect(window.location.search).toContain("income=100000");
  });
});
