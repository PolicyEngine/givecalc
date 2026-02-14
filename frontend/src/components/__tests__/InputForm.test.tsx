/**
 * Tests for InputForm component - Wizard flow and state dropdown
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import InputForm from "../InputForm";
import type { StateInfo } from "../../lib/types";
import { DEFAULT_FORM_STATE } from "../../lib/types";

// Mock states data
const mockStates: StateInfo[] = [
  { code: "AL", name: "Alabama", has_special_programs: false },
  { code: "CA", name: "California", has_special_programs: false },
  { code: "NY", name: "New York", has_special_programs: false },
  { code: "AZ", name: "Arizona", has_special_programs: true },
];

describe("InputForm - Wizard Flow", () => {
  const defaultProps = {
    formState: DEFAULT_FORM_STATE,
    setFormState: vi.fn(),
    states: mockStates,
    onCalculate: vi.fn(),
    isCalculating: false,
  };

  it("renders donation section active and details locked initially", () => {
    render(<InputForm {...defaultProps} />);

    expect(screen.getByText("Your donation")).toBeInTheDocument();
    expect(screen.getByText("Your details")).toBeInTheDocument();
    expect(
      screen.getByText("Complete previous section first"),
    ).toBeInTheDocument();
  });

  it("unlocks details section after entering donation and clicking Continue", () => {
    const propsWithDonation = {
      ...defaultProps,
      formState: {
        ...DEFAULT_FORM_STATE,
        donation_amount: 5000,
      },
    };

    render(<InputForm {...propsWithDonation} />);

    // Click Continue to advance past donation step
    const continueButton = screen.getByText("Enter household info");
    fireEvent.click(continueButton);

    // Details section should now be active with state dropdown visible
    const select = screen.getByRole("combobox");
    expect(select).toBeInTheDocument();
  });

  it("renders all state options after unlocking details", () => {
    const propsWithDonation = {
      ...defaultProps,
      formState: {
        ...DEFAULT_FORM_STATE,
        donation_amount: 5000,
      },
    };

    render(<InputForm {...propsWithDonation} />);
    fireEvent.click(screen.getByText("Enter household info"));

    const select = screen.getByRole("combobox");
    const options = select.querySelectorAll("option");

    // Should have placeholder + 4 states
    expect(options.length).toBe(5);

    expect(screen.getByText("Alabama")).toBeInTheDocument();
    expect(screen.getByText("California")).toBeInTheDocument();
    expect(screen.getByText("New York")).toBeInTheDocument();
    expect(screen.getByText("Arizona")).toBeInTheDocument();
  });

  it("renders with empty states array without crashing", () => {
    const propsWithDonationNoStates = {
      ...defaultProps,
      formState: {
        ...DEFAULT_FORM_STATE,
        donation_amount: 5000,
      },
      states: [],
    };

    render(<InputForm {...propsWithDonationNoStates} />);
    fireEvent.click(screen.getByText("Enter household info"));

    const select = screen.getByRole("combobox");
    const options = select.querySelectorAll("option");

    // Should only have the placeholder
    expect(options.length).toBe(1);
    expect(screen.getByText("Select a state...")).toBeInTheDocument();
  });
});
