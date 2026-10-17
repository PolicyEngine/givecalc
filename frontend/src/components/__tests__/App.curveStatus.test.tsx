/**
 * The chart's loading and failure states belong to the form on screen, not
 * to whichever /api/calculate request was made last. Scenarios from the
 * PR #89 review, which reproduced both failures before the fix.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import {
  render,
  screen,
  cleanup,
  fireEvent,
  act,
} from "@testing-library/react";
import type { FormState } from "../../lib/types";

vi.mock("../Header", () => ({ default: () => <div /> }));
vi.mock("../TaxInfo", () => ({ default: () => <div /> }));
vi.mock("../TaxChart", () => ({
  default: () => <div data-testid="tax-chart" />,
}));
vi.mock("../MarginalChart", () => ({
  default: () => <div data-testid="marginal-chart" />,
}));
vi.mock("../InputForm", () => ({
  default: ({
    formState,
    setFormState,
    onCalculate,
  }: {
    formState: FormState;
    setFormState: (s: FormState) => void;
    onCalculate: () => void;
  }) => (
    <div>
      <button
        onClick={() =>
          setFormState({ ...formState, state_code: "CA", donation_amount: 1000 })
        }
      >
        form A
      </button>
      <button
        onClick={() =>
          setFormState({ ...formState, state_code: "CA", donation_amount: 2000 })
        }
      >
        form B
      </button>
      <button onClick={() => onCalculate()}>calc</button>
    </div>
  ),
}));

type Pending = { resolve: (v: unknown) => void; reject: (e: unknown) => void };
const pending: Record<string, Pending> = {};
const slow = { savingsA: false };

function wait(name: string) {
  return new Promise((resolve, reject) => {
    pending[name] = { resolve, reject };
  });
}

function headline(gift: number) {
  return {
    year: 2026,
    donation_amount: gift,
    baseline_net_tax: 10_000,
    net_tax_at_donation: 10_000 - gift * 0.2,
    tax_savings: gift * 0.2,
    baseline_net_income: 60_000,
    net_income_after_donation: 60_000 - gift * 0.8,
    bunching: null,
  };
}

function full(gift: number) {
  return {
    ...headline(gift),
    marginal_savings_rate: 0.2,
    curve: [{ donation: 0, net_tax: 1, marginal_savings: 0.2, net_income: 1 }],
  };
}

vi.mock("../../lib/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../lib/api")>();
  return {
    ...original,
    calculateSavings: vi.fn((req: { donation_amount: number }) => {
      if (!(slow.savingsA && req.donation_amount === 1000)) {
        return Promise.resolve(headline(req.donation_amount));
      }
      return wait(pending["savings 1000"] ? "savings 1000 again" : "savings 1000");
    }),
    calculateDonation: vi.fn((req: { donation_amount: number }) => {
      const name = `full ${req.donation_amount}`;
      return wait(pending[name] ? `${name} again` : name);
    }),
  };
});

import App from "../../App";

const LOADING = "Loading the chart across donation amounts...";
const FAILED = "The chart could not load. Calculate again to retry.";

async function click(name: string) {
  await act(async () => {
    fireEvent.click(screen.getByText(name));
  });
}

async function settle(fn: () => void) {
  await act(async () => {
    fn();
    await new Promise((r) => setTimeout(r, 10));
  });
}

beforeEach(() => {
  slow.savingsA = false;
  for (const key of Object.keys(pending)) delete pending[key];
});
afterEach(cleanup);

describe("curve status per form", () => {
  it("shows form A's failed curve when returning to A, not a spinner", async () => {
    render(<App />);
    await click("form A");
    await click("calc");
    await click("form B");
    await click("calc");
    await settle(() => {
      pending["full 1000"].reject(new Error("A's curve failed"));
      pending["full 2000"].resolve(full(2000));
    });
    expect(screen.getByTestId("tax-chart")).toBeInTheDocument();

    await click("form A");
    expect(screen.queryAllByText(LOADING)).toHaveLength(0);
    expect(screen.getAllByText(FAILED)).toHaveLength(2);
  });

  it("keeps form B loading while form A's later curve request fails", async () => {
    slow.savingsA = true;
    render(<App />);
    await click("form A");
    await click("calc");
    await click("form B");
    await click("calc");
    // A's headline arrives after B's curve request started, so A's curve
    // request is the last one made.
    await settle(() => pending["savings 1000"].resolve(headline(1000)));
    expect(pending["full 1000"]).toBeDefined();

    await settle(() => pending["full 1000"].reject(new Error("A failed")));
    expect(screen.getAllByText(LOADING)).toHaveLength(2);
    expect(screen.queryAllByText(FAILED)).toHaveLength(0);

    await settle(() => pending["full 2000"].resolve(full(2000)));
    expect(screen.getByTestId("tax-chart")).toBeInTheDocument();
    expect(screen.queryAllByText(LOADING)).toHaveLength(0);
  });

  it("ignores an earlier request's failure when Calculate is clicked twice", async () => {
    slow.savingsA = true;
    render(<App />);
    await click("form A");
    await click("calc");
    await click("calc");
    await settle(() => {
      pending["savings 1000"].resolve(headline(1000));
      pending["savings 1000 again"].resolve(headline(1000));
    });
    expect(pending["full 1000"]).toBeDefined();
    expect(pending["full 1000 again"]).toBeDefined();

    await settle(() => pending["full 1000"].reject(new Error("first failed")));
    expect(screen.getAllByText(LOADING)).toHaveLength(2);
    expect(screen.queryAllByText(FAILED)).toHaveLength(0);

    await settle(() => pending["full 1000 again"].resolve(full(1000)));
    expect(screen.getByTestId("tax-chart")).toBeInTheDocument();
  });

  it("shows an earlier request's chart when the later one fails", async () => {
    slow.savingsA = true;
    render(<App />);
    await click("form A");
    await click("calc");
    await click("calc");
    await settle(() => {
      pending["savings 1000"].resolve(headline(1000));
      pending["savings 1000 again"].resolve(headline(1000));
    });
    await settle(() => pending["full 1000"].resolve(full(1000)));
    await settle(() =>
      pending["full 1000 again"].reject(new Error("second failed")),
    );
    expect(screen.getByTestId("tax-chart")).toBeInTheDocument();
    expect(screen.queryAllByText(FAILED)).toHaveLength(0);
  });
});
