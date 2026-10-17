/**
 * Result publishing and shareable URLs (review of #86, 2026-10-17).
 *
 * - A response that arrives after the inputs changed must not appear under
 *   the new inputs.
 * - Restoring a cached result must point the URL at that result's inputs.
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
import type { CalculateRequest, CalculateResponse } from "../../lib/types";

// Recharts' ResponsiveContainer needs ResizeObserver, which jsdom lacks.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

const calls: {
  request: CalculateRequest;
  resolve: (r: CalculateResponse) => void;
}[] = [];

vi.mock("../../lib/api", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    calculateDonation: vi.fn(
      (request: CalculateRequest) =>
        new Promise<CalculateResponse>((resolve) => {
          calls.push({ request, resolve });
        }),
    ),
  };
});

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

/** Resolve the main calculation; bunching calls stay pending. */
async function resolveMain(index: number, savings: number) {
  const call = calls[index];
  await act(async () => {
    call.resolve(response(call.request.donation_amount, savings));
  });
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

    // Change the pledge while the first calculation is still running.
    fireEvent.click(screen.getByText("10% of income ($15,000)"));
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
    fireEvent.click(screen.getByText("10% of income ($16,000)"));
    fireEvent.click(screen.getByRole("button", { name: "Specific amount" }));
    fireEvent.change(
      screen.getByLabelText("How much are you planning to donate?"),
      { target: { value: "16000" } },
    );

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
        screen.getByText("Giving 10% of your income ($10,000) costs you $9,500 in 2026."),
      ).toBeInTheDocument(),
    );

    // Recalculate at $200,000.
    fireEvent.click(screen.getByText("$100,000 income, CA"));
    const wages = screen.getByPlaceholderText("Enter annual income");
    fireEvent.change(wages, { target: { value: "200000" } });
    fireEvent.click(screen.getByRole("button", { name: "Calculate tax impact" }));
    await waitFor(() =>
      expect(
        calls.some((c) => c.request.income.wages_and_salaries === 200_000),
      ).toBe(true),
    );
    const second = calls.findIndex(
      (c) =>
        c.request.income.wages_and_salaries === 200_000 &&
        c.request.year === 2026 &&
        c.request.donation_amount === 20_000,
    );
    await resolveMain(second, 2_000);
    await waitFor(() =>
      expect(window.location.search).toContain("income=200000"),
    );

    // Back to $100,000: the cached result returns and the URL follows it.
    fireEvent.click(screen.getByText("$200,000 income, CA"));
    fireEvent.change(screen.getByPlaceholderText("Enter annual income"), {
      target: { value: "100000" },
    });
    expect(
      screen.getByText("Giving 10% of your income ($10,000) costs you $9,500 in 2026."),
    ).toBeInTheDocument();
    expect(window.location.search).toContain("income=100000");
  });
});
