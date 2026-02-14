/**
 * Tests for App component - State loading and data flow
 *
 * Note: States and tax programs are now hardcoded in the frontend,
 * so there's no loading state or API calls for initial data.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import * as api from "../../lib/api";

// Mock the API module - only calculateDonation and calculateTargetDonation make real API calls now
vi.mock("../../lib/api", async (importOriginal) => {
  const actual = (await importOriginal()) as typeof api;
  return {
    ...actual,
    calculateDonation: vi.fn(),
    calculateTargetDonation: vi.fn(),
  };
});

describe("App - Instant Load with Hardcoded Data", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders immediately without loading spinner (data is hardcoded)", async () => {
    // Import fresh App for this test
    const App = (await import("../../App")).default;
    render(<App />);

    // Should NOT show loading spinner - data is available immediately
    const spinner = document.querySelector(".animate-spin");
    expect(spinner).not.toBeInTheDocument();

    // Should show the donation section (wizard step 1)
    expect(screen.getByText("Your donation")).toBeInTheDocument();
  });

  it("shows locked details section before donation is entered", async () => {
    const App = (await import("../../App")).default;
    render(<App />);

    // Details section should be locked (shown as locked text)
    expect(screen.getByText("Your details")).toBeInTheDocument();
    expect(
      screen.getByText("Complete previous section first"),
    ).toBeInTheDocument();
  });

  it("uses hardcoded STATES constant directly", async () => {
    // Verify STATES is exported and has correct structure
    expect(api.STATES).toBeDefined();
    expect(api.STATES.states).toBeInstanceOf(Array);
    expect(api.STATES.states.length).toBeGreaterThan(50); // All US states + DC

    // Check structure of state entries
    const california = api.STATES.states.find((s) => s.code === "CA");
    expect(california).toBeDefined();
    expect(california?.name).toBe("California");
    expect(california?.has_special_programs).toBeDefined();
  });
});
