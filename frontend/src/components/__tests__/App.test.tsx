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

    // Should show the main content immediately
    expect(screen.getByText("Your information")).toBeInTheDocument();
  });

  it("has all states available in dropdown immediately", async () => {
    const App = (await import("../../App")).default;
    render(<App />);

    // States should be available immediately
    const select = screen.getByRole("combobox");
    expect(select).toBeInTheDocument();

    // Check that some states are rendered
    expect(screen.getByText("California")).toBeInTheDocument();
    expect(screen.getByText("New York")).toBeInTheDocument();
    expect(screen.getByText("Texas")).toBeInTheDocument();
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
